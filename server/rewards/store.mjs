import { DatabaseSync } from "node:sqlite";
import { randomUUID, randomInt } from "node:crypto";
import { REWARDS, validateConfig } from "../../config/rewards.mjs";

/** Single-process SQLite ledger. Every balance/inventory mutation is one transaction. */
export class RewardStore {
  constructor(
    filename,
    {
      config = REWARDS,
      roll = () => randomInt(10000),
      now = () => new Date(),
    } = {},
  ) {
    validateConfig(config);
    this.config = config;
    this.roll = roll;
    this.now = now;
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, shards INTEGER NOT NULL DEFAULT 0 CHECK(shards>=0), wins INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS treasury(id INTEGER PRIMARY KEY CHECK(id=1), available INTEGER NOT NULL CHECK(available>=0), inventory INTEGER NOT NULL CHECK(inventory>=0));
      CREATE TABLE IF NOT EXISTS packs(id TEXT PRIMARY KEY, owner TEXT REFERENCES accounts(id), battle TEXT UNIQUE, day TEXT, config TEXT, tier TEXT, odds INTEGER, shards INTEGER, state TEXT DEFAULT 'unopened', result TEXT);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, owner TEXT REFERENCES accounts(id), source TEXT UNIQUE, status TEXT DEFAULT 'pending', result TEXT, error TEXT);
      CREATE TABLE IF NOT EXISTS ledger(id INTEGER PRIMARY KEY, owner TEXT, event TEXT, reference TEXT, delta INTEGER, created TEXT);
      CREATE TABLE IF NOT EXISTS deposits(reference TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('fee','topup')), cents INTEGER NOT NULL CHECK(cents>=0), cards INTEGER NOT NULL CHECK(cards>=0), note TEXT, created TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS deposits_created ON deposits(kind, created);
    `);
    // Older databases: record how each pack's odds were bound.
    const columns = this.db
      .prepare("PRAGMA table_info(packs)")
      .all()
      .map((c) => c.name);
    if (!columns.includes("base_bps"))
      this.db.exec("ALTER TABLE packs ADD COLUMN base_bps INTEGER");
    if (!columns.includes("funding"))
      this.db.exec("ALTER TABLE packs ADD COLUMN funding TEXT");
    this.db
      .prepare("INSERT OR IGNORE INTO treasury VALUES(1,?,?)")
      .run(config.initialBudgetCents, config.initialInventory);
  }
  close() {
    this.db.close();
  }
  transaction(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  account(id) {
    this.db.prepare("INSERT OR IGNORE INTO accounts(id) VALUES(?)").run(id);
    return this.db.prepare("SELECT * FROM accounts WHERE id=?").get(id);
  }
  event(owner, event, reference, delta = 0) {
    this.db
      .prepare(
        "INSERT INTO ledger(owner,event,reference,delta,created) VALUES(?,?,?,?,?)",
      )
      .run(owner, event, reference, delta, this.now().toISOString());
  }
  tier(id) {
    const a = this.account(id);
    return this.config.tiers.filter((t) => t.wins <= a.wins).at(-1);
  }
  nextTier(id) {
    const a = this.account(id);
    return this.config.tiers.find((t) => t.wins > a.wins) || null;
  }
  treasury() {
    return this.db.prepare("SELECT * FROM treasury WHERE id=1").get();
  }
  /** Bank health right now: how much spendable funding exists and how much fee income arrived recently. */
  bank() {
    const d = this.config.dynamicOdds,
      t = this.treasury();
    if (!d?.enabled)
      return { enabled: false, multiplier: 1, available: t.available };
    const since = new Date(
      this.now().getTime() - d.windowDays * 86400000,
    ).toISOString();
    const fees =
      this.db
        .prepare(
          "SELECT COALESCE(SUM(cents),0) AS n FROM deposits WHERE kind='fee' AND created>=?",
        )
        .get(since).n || 0;
    const cap = (n) => Math.min(d.maxMultiplier, n);
    const reserveRatio =
      t.available / (d.targetReserveCards * this.config.cardCostCents);
    const feeRatio = fees / d.targetWindowFeeCents;
    const raw =
      d.reserveWeight * cap(reserveRatio) +
      (1 - d.reserveWeight) * cap(feeRatio);
    const multiplier = Math.min(
      d.maxMultiplier,
      Math.max(d.minMultiplier, raw),
    );
    return {
      enabled: true,
      multiplier: Math.round(multiplier * 1000) / 1000,
      reserveRatio: Math.round(reserveRatio * 1000) / 1000,
      feeRatio: Math.round(feeRatio * 1000) / 1000,
      windowFeeCents: fees,
      windowDays: d.windowDays,
      available: t.available,
      inventory: t.inventory,
    };
  }
  /** Card chance a pack of this tier would receive if it were earned now. */
  oddsFor(tier, bank = this.bank()) {
    if (!bank.enabled) return tier.cardBps;
    return Math.min(
      this.config.dynamicOdds.maxCardBps,
      Math.max(0, Math.round(tier.cardBps * bank.multiplier)),
    );
  }
  /** Operator-only: record settled fee income or a manual top-up. Idempotent by reference. */
  deposit({ reference, cents = 0, cards = 0, kind = "fee", note = "" }) {
    if (
      typeof reference !== "string" ||
      !/^[A-Za-z0-9:_.-]{4,128}$/.test(reference)
    )
      throw Error("Deposit reference must be 4–128 letters, digits or :_.-");
    if (!["fee", "topup"].includes(kind))
      throw Error("Deposit kind must be fee or topup");
    if (
      !Number.isSafeInteger(cents) ||
      cents < 0 ||
      !Number.isSafeInteger(cards) ||
      cards < 0
    )
      throw Error("Deposit amounts must be whole, non-negative numbers");
    if (!cents && !cards) throw Error("Deposit is empty");
    return this.transaction(() => {
      const old = this.db
        .prepare("SELECT * FROM deposits WHERE reference=?")
        .get(reference);
      if (old) {
        if (old.cents !== cents || old.cards !== cards || old.kind !== kind)
          throw Error("Reference already used for a different deposit");
        return { ...old, duplicate: true };
      }
      const created = this.now().toISOString();
      this.db
        .prepare(
          "INSERT INTO deposits(reference,kind,cents,cards,note,created) VALUES(?,?,?,?,?,?)",
        )
        .run(
          reference,
          kind,
          cents,
          cards,
          String(note).slice(0, 200),
          created,
        );
      this.db
        .prepare(
          "UPDATE treasury SET available=available+?, inventory=inventory+? WHERE id=1",
        )
        .run(cents, cards);
      this.event("operator", `deposit-${kind}`, reference, cents);
      return {
        reference,
        kind,
        cents,
        cards,
        created,
        duplicate: false,
      };
    });
  }
  day() {
    return this.now().toISOString().slice(0, 10);
  }
  issuedToday(id) {
    return this.db
      .prepare("SELECT count(*) AS n FROM packs WHERE owner=? AND day=?")
      .get(id, this.day()).n;
  }
  canIssue(id) {
    if (this.issuedToday(id) >= this.config.dailyLimit)
      throw Error("Daily pack limit reached. Resets at 00:00 UTC.");
    const t = this.db.prepare("SELECT * FROM treasury WHERE id=1").get();
    if (t.available < this.config.cardCostCents || t.inventory < 1)
      throw Error("Reward reserve depleted. Existing rewards are preserved.");
  }
  /** Called ONLY by the server battle authority, never from a client win claim. */
  awardVictory(owner, battle, tier) {
    return this.transaction(() => {
      const old = this.db
        .prepare("SELECT * FROM packs WHERE battle=?")
        .get(battle);
      if (old) {
        if (old.owner !== owner) throw Error("Not your battle");
        return old;
      }
      this.account(owner);
      this.canIssue(owner);
      const id = randomUUID(),
        c = this.config,
        bank = this.bank(),
        odds = this.oddsFor(tier, bank);
      // Reserve one whole card per unopened pack (stronger than expected-value backing).
      this.db
        .prepare(
          "UPDATE treasury SET available=available-?, inventory=inventory-1 WHERE id=1",
        )
        .run(c.cardCostCents);
      this.db
        .prepare(
          "INSERT INTO packs(id,owner,battle,day,config,tier,odds,shards,base_bps,funding) VALUES(?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          owner,
          battle,
          this.day(),
          c.version,
          tier.id,
          odds,
          tier.shards,
          tier.cardBps,
          JSON.stringify({
            multiplier: bank.multiplier,
            reserveRatio: bank.reserveRatio ?? null,
            feeRatio: bank.feeRatio ?? null,
          }),
        );
      this.db.prepare("UPDATE accounts SET wins=wins+1 WHERE id=?").run(owner);
      this.event(owner, "pack-earned", id);
      return this.db.prepare("SELECT * FROM packs WHERE id=?").get(id);
    });
  }
  pack(owner, id) {
    const p = this.db
      .prepare("SELECT * FROM packs WHERE id=? AND owner=?")
      .get(id, owner);
    if (!p) throw Error("Pack not found");
    return p;
  }
  open(owner, id) {
    return this.transaction(() => {
      const p = this.pack(owner, id);
      if (p.result) return JSON.parse(p.result);
      const card = this.roll() < p.odds,
        c = this.config;
      let result;
      if (card) {
        const job = this.createJob(owner, `pack:${id}`);
        result = { kind: "card", job, label: "Sandbox card entitlement" };
      } else {
        const backing = p.shards * (c.cardCostCents / c.redemptionShards);
        this.db
          .prepare("UPDATE accounts SET shards=shards+? WHERE id=?")
          .run(p.shards, owner);
        // Convert whole-card reservation to fully backed fractional shard liability.
        this.db
          .prepare(
            "UPDATE treasury SET available=available+?, inventory=inventory+1 WHERE id=1",
          )
          .run(c.cardCostCents - backing);
        result = { kind: "shards", amount: p.shards };
      }
      this.db
        .prepare("UPDATE packs SET state='settled',result=? WHERE id=?")
        .run(JSON.stringify(result), id);
      this.event(owner, "pack-settled", id, card ? 0 : p.shards);
      return result;
    });
  }
  reveal(owner, id) {
    this.pack(owner, id);
    this.db
      .prepare(
        "UPDATE packs SET state='revealed' WHERE id=? AND result IS NOT NULL",
      )
      .run(id);
  }
  createJob(owner, source) {
    const id = randomUUID();
    this.db
      .prepare("INSERT INTO jobs(id,owner,source) VALUES(?,?,?)")
      .run(id, owner, source);
    return id;
  }
  redeem(owner, key) {
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(key))
      throw Error("Invalid redemption reference");
    return this.transaction(() => {
      const source = `redeem:${owner}:${key}`,
        old = this.db.prepare("SELECT id FROM jobs WHERE source=?").get(source);
      if (old) return { job: old.id };
      const a = this.account(owner),
        c = this.config;
      if (a.shards < c.redemptionShards) throw Error("Not enough shards");
      const t = this.db.prepare("SELECT * FROM treasury WHERE id=1").get();
      if (t.inventory < 1)
        throw Error("Card pool unavailable. Your shards have not been spent.");
      // Shards already reserve the full cost. Do not charge available funding again.
      this.db
        .prepare("UPDATE treasury SET inventory=inventory-1 WHERE id=1")
        .run();
      this.db
        .prepare("UPDATE accounts SET shards=shards-? WHERE id=?")
        .run(c.redemptionShards, owner);
      const job = this.createJob(owner, source);
      this.event(owner, "shards-redeemed", job, -c.redemptionShards);
      return { job };
    });
  }
  async fulfill(owner, id, provider) {
    const job = this.db
      .prepare("SELECT * FROM jobs WHERE id=? AND owner=?")
      .get(id, owner);
    if (!job) throw Error("Reward not found");
    if (job.status === "fulfilled") return JSON.parse(job.result);
    try {
      const result = await provider.fulfill({ id: job.id, playerRef: owner });
      this.db
        .prepare(
          "UPDATE jobs SET status='fulfilled',result=?,error=NULL WHERE id=?",
        )
        .run(JSON.stringify(result), id);
      return result;
    } catch {
      // Do not refund/re-roll on ambiguous provider timeouts; retry the same stable job.
      this.db
        .prepare(
          "UPDATE jobs SET error='Provider unavailable; retry the same reward' WHERE id=? AND status!='fulfilled'",
        )
        .run(id);
      throw Error(
        "Provider unavailable. Reward remains pending; retry safely.",
      );
    }
  }
  snapshot(owner) {
    const a = this.account(owner),
      tier = this.tier(owner),
      bank = this.bank();
    return {
      mode: "sandbox",
      ...a,
      tier,
      nextTier: this.nextTier(owner),
      ladder: this.config.tiers.map(({ id, name, wins, cardBps, shards }) => ({
        id,
        name,
        wins,
        cardBps,
        shards,
      })),
      // What the NEXT earned pack would get right now; earned packs keep their own odds.
      nextOdds: {
        bps: this.oddsFor(tier, bank),
        baseBps: tier.cardBps,
        multiplier: bank.multiplier,
        reserveRatio: bank.reserveRatio ?? null,
        feeRatio: bank.feeRatio ?? null,
      },
      dailyUsed: this.issuedToday(owner),
      dailyLimit: this.config.dailyLimit,
      configVersion: this.config.version,
      redemptionShards: this.config.redemptionShards,
      packs: this.db
        .prepare("SELECT * FROM packs WHERE owner=? ORDER BY rowid DESC")
        .all(owner)
        .map((p) => ({
          ...p,
          result: p.result ? JSON.parse(p.result) : null,
          funding: p.funding ? JSON.parse(p.funding) : null,
        })),
      jobs: this.db
        .prepare("SELECT * FROM jobs WHERE owner=? ORDER BY rowid DESC")
        .all(owner)
        .map((j) => ({ ...j, result: j.result ? JSON.parse(j.result) : null })),
    };
  }
}
