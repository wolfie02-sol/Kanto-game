import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RewardStore } from "../server/rewards/store.mjs";
import { REWARDS, validateConfig } from "../config/rewards.mjs";

const day = (n) => new Date(Date.UTC(2026, 10, 1 + n, 12));
const setup = (options = {}) => new RewardStore(":memory:", options);
const winTo = (s, owner, wins) =>
  s.db.prepare("UPDATE accounts SET wins=? WHERE id=?").run(wins, owner);

test("the ladder is long and every tier improves base odds", () => {
  const t = REWARDS.tiers;
  assert.ok(t.length >= 10);
  assert.ok(t.at(-1).wins >= 150, "top tier should take a long grind");
  for (let i = 1; i < t.length; i++) {
    assert.ok(t[i].wins > t[i - 1].wins);
    assert.ok(t[i].cardBps > t[i - 1].cardBps);
    assert.ok(t[i].shards >= t[i - 1].shards);
  }
  const s = setup();
  s.account("a");
  assert.equal(s.tier("a").id, "trail");
  assert.equal(s.nextTier("a").id, "grove");
  winTo(s, "a", 15);
  assert.equal(s.tier("a").id, "summit");
  winTo(s, "a", 999);
  assert.equal(s.tier("a").id, "mythic");
  assert.equal(s.nextTier("a"), null);
  s.close();
});

test("fee income and bank reserve raise odds; a drained bank lowers them", () => {
  let now = day(10);
  const s = setup({ now: () => now }),
    trail = REWARDS.tiers[0];
  // Sandbox start: reserve covers 200 cards against a 100-card target, no fees yet.
  assert.equal(s.bank().multiplier, 1.2);
  assert.equal(s.oddsFor(trail), 120);
  s.deposit({ reference: "sig:week-1", cents: 250000 });
  assert.equal(s.bank().feeRatio, 1);
  assert.ok(s.oddsFor(trail) > 120);
  // Fees older than the window stop counting; the balance they added remains.
  now = day(20);
  assert.equal(s.bank().feeRatio, 0);
  assert.equal(s.bank().reserveRatio, 2.5);
  // Nearly empty bank and no recent fees: clamp at the minimum multiplier.
  s.db.exec("UPDATE treasury SET available=5000");
  assert.equal(s.bank().multiplier, REWARDS.dynamicOdds.minMultiplier);
  assert.equal(s.oddsFor(trail), 50);
  s.close();
});

test("odds never exceed the configured ceiling", () => {
  const config = {
    ...REWARDS,
    dynamicOdds: { ...REWARDS.dynamicOdds, maxCardBps: 500 },
  };
  const s = setup({ config });
  s.deposit({ reference: "sig:huge", cents: 100000000 });
  assert.equal(s.bank().multiplier, REWARDS.dynamicOdds.maxMultiplier);
  assert.equal(s.oddsFor(REWARDS.tiers.at(-1)), 500);
  s.close();
});

test("an earned pack keeps the odds it was given", () => {
  const s = setup();
  const before = s.snapshot("a").nextOdds;
  const pack = s.awardVictory("a", "battle-1", REWARDS.tiers[0]);
  assert.equal(pack.odds, before.bps);
  assert.equal(pack.base_bps, 100);
  assert.equal(JSON.parse(pack.funding).multiplier, before.multiplier);
  s.deposit({ reference: "sig:later", cents: 5000000 });
  assert.ok(s.snapshot("a").nextOdds.bps > before.bps);
  assert.equal(s.snapshot("a").packs[0].odds, before.bps);
  // Opening uses the stored odds: a roll just above them is shards.
  s.roll = () => before.bps;
  assert.equal(s.open("a", pack.id).kind, "shards");
  s.close();
});

test("deposits are idempotent, validated, and top-ups are not fee income", () => {
  const s = setup();
  const start = s.treasury();
  const first = s.deposit({ reference: "sig:abc123", cents: 1000, cards: 2 });
  assert.equal(first.duplicate, false);
  assert.equal(
    s.deposit({ reference: "sig:abc123", cents: 1000, cards: 2 }).duplicate,
    true,
  );
  assert.equal(s.treasury().available, start.available + 1000);
  assert.equal(s.treasury().inventory, start.inventory + 2);
  assert.throws(
    () => s.deposit({ reference: "sig:abc123", cents: 999 }),
    /different deposit/,
  );
  assert.throws(() => s.deposit({ reference: "x", cents: 1 }), /reference/);
  assert.throws(() => s.deposit({ reference: "sig:neg", cents: -5 }), /whole/);
  assert.throws(
    () => s.deposit({ reference: "sig:frac", cents: 1.5 }),
    /whole/,
  );
  assert.throws(() => s.deposit({ reference: "sig:none" }), /empty/);
  s.deposit({ reference: "manual:top-up-1", cents: 500000, kind: "topup" });
  assert.equal(s.bank().windowFeeCents, 1000);
  const events = s.db
    .prepare("SELECT event FROM ledger WHERE owner='operator'")
    .all()
    .map((e) => e.event);
  assert.deepEqual(events, ["deposit-fee", "deposit-topup"]);
  s.close();
});

test("an older rewards database is upgraded without losing packs", () => {
  const dir = mkdtempSync(join(tmpdir(), "kanto-odds-"));
  const file = join(dir, "old.sqlite");
  try {
    const old = new DatabaseSync(file);
    old.exec(`CREATE TABLE accounts(id TEXT PRIMARY KEY, shards INTEGER NOT NULL DEFAULT 0 CHECK(shards>=0), wins INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE packs(id TEXT PRIMARY KEY, owner TEXT REFERENCES accounts(id), battle TEXT UNIQUE, day TEXT, config TEXT, tier TEXT, odds INTEGER, shards INTEGER, state TEXT DEFAULT 'unopened', result TEXT);
      INSERT INTO accounts VALUES('a',0,1);
      INSERT INTO packs(id,owner,battle,day,config,tier,odds,shards) VALUES('p1','a','b1','2026-11-01','sandbox-v1','trail',100,50);`);
    old.close();
    const s = new RewardStore(file, { roll: () => 9999 });
    const pack = s.snapshot("a").packs[0];
    assert.equal(pack.id, "p1");
    assert.equal(pack.odds, 100);
    assert.equal(pack.funding, null);
    assert.equal(s.open("a", "p1").amount, 50);
    s.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("invalid ladders and dynamic settings are rejected", () => {
  const t = REWARDS.tiers;
  assert.throws(
    () => validateConfig({ ...REWARDS, tiers: [t[1], t[0]] }),
    /Invalid tier|0 wins/,
  );
  assert.throws(
    () => validateConfig({ ...REWARDS, tiers: [t[0], t[0]] }),
    /Invalid tier/,
  );
  assert.throws(() => validateConfig({ ...REWARDS, tiers: [t[1]] }), /0 wins/);
  assert.throws(
    () =>
      validateConfig({
        ...REWARDS,
        dynamicOdds: { ...REWARDS.dynamicOdds, minMultiplier: 3 },
      }),
    /dynamic odds/,
  );
});
