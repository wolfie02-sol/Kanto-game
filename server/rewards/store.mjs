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
    `);
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
        c = this.config;
      // Reserve one whole card per unopened pack (stronger than expected-value backing).
      this.db
        .prepare(
          "UPDATE treasury SET available=available-?, inventory=inventory-1 WHERE id=1",
        )
        .run(c.cardCostCents);
      this.db
        .prepare(
          "INSERT INTO packs(id,owner,battle,day,config,tier,odds,shards) VALUES(?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          owner,
          battle,
          this.day(),
          c.version,
          tier.id,
          tier.cardBps,
          tier.shards,
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
    const a = this.account(owner);
    return {
      mode: "sandbox",
      ...a,
      tier: this.tier(owner),
      dailyUsed: this.issuedToday(owner),
      dailyLimit: this.config.dailyLimit,
      configVersion: this.config.version,
      redemptionShards: this.config.redemptionShards,
      packs: this.db
        .prepare("SELECT * FROM packs WHERE owner=? ORDER BY rowid DESC")
        .all(owner)
        .map((p) => ({ ...p, result: p.result ? JSON.parse(p.result) : null })),
      jobs: this.db
        .prepare("SELECT * FROM jobs WHERE owner=? ORDER BY rowid DESC")
        .all(owner)
        .map((j) => ({ ...j, result: j.result ? JSON.parse(j.result) : null })),
    };
  }
}
