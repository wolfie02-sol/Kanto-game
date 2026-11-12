import { test } from "node:test";
import assert from "node:assert/strict";
import { RewardStore } from "../server/rewards/store.mjs";
import { REWARDS, validateConfig } from "../config/rewards.mjs";
import {
  SandboxProvider,
  CollectorCryptDevelopment,
} from "../server/providers/collector-crypt.mjs";
import { BossAuthority } from "../server/rewards/bosses.mjs";
import { moveData, effectiveness, species } from "../dist/engine.mjs";
// Ledger mechanics are checked with fixed odds; bank-adaptive odds have their own tests.
const STATIC = {
  ...REWARDS,
  dynamicOdds: { ...REWARDS.dynamicOdds, enabled: false },
};
const TIER = {
  id: "trail",
  name: "Trail",
  wins: 0,
  level: 20,
  cardBps: 100,
  shards: 50,
};
const BIG = { ...TIER, id: "big", shards: 100 };
const setup = (options = {}) =>
  new RewardStore(":memory:", { config: STATIC, ...options });
test("victory claims are idempotent and daily caps use server UTC", () => {
  let now = new Date("2026-11-11T23:59:59Z");
  const s = setup({ now: () => now });
  const first = s.awardVictory("a", "battle", TIER);
  assert.equal(s.awardVictory("a", "battle", TIER).id, first.id);
  for (let i = 1; i < 10; i++) s.awardVictory("a", `battle${i}`, TIER);
  assert.throws(() => s.awardVictory("a", "extra", TIER), /Daily/);
  now = new Date("2026-11-12T00:00:00Z");
  s.awardVictory("a", "tomorrow", TIER);
  assert.equal(s.snapshot("a").dailyUsed, 1);
  s.close();
});
test("concurrent/repeated opens persist one outcome and enforce ownership", async () => {
  const s = setup({ roll: () => 9999 }),
    p = s.awardVictory("a", "b", TIER);
  const values = await Promise.all(
    Array.from({ length: 20 }, () =>
      Promise.resolve().then(() => s.open("a", p.id)),
    ),
  );
  assert.ok(values.every((v) => v.amount === 50));
  assert.equal(s.snapshot("a").shards, 50);
  assert.throws(() => s.open("thief", p.id), /not found/);
  s.reveal("a", p.id);
  assert.equal(s.snapshot("a").packs[0].state, "revealed");
  s.close();
});
test("card boundary, atomic funding reservation, depleted reserve and no rerolls", () => {
  const config = { ...STATIC, initialBudgetCents: 5000, initialInventory: 1 };
  const s = setup({ config, roll: () => 99 });
  const p = s.awardVictory("a", "b", TIER);
  assert.throws(() => s.awardVictory("a", "c", TIER), /depleted/);
  assert.equal(s.open("a", p.id).kind, "card");
  assert.equal(s.snapshot("a").jobs.length, 1);
  assert.deepEqual(s.open("a", p.id), s.open("a", p.id));
  s.close();
  const t = setup({ roll: () => 100 });
  assert.equal(t.open("a", t.awardVictory("a", "d", TIER).id).kind, "shards");
  t.close();
});
test("redemption is atomic, retries are idempotent, failures preserve entitlement", async () => {
  const s = setup({ roll: () => 9999 });
  for (let i = 0; i < 10; i++)
    s.open("a", s.awardVictory("a", `b${i}`, BIG).id);
  const [one, two] = await Promise.all(
    [1, 2].map(() =>
      Promise.resolve().then(() => s.redeem("a", "same-request")),
    ),
  );
  assert.equal(one.job, two.job);
  assert.equal(s.snapshot("a").shards, 0);
  assert.throws(() => s.redeem("a", "different-request"), /Not enough/);
  await assert.rejects(
    s.fulfill("a", one.job, {
      fulfill: async () => {
        throw Error("timeout");
      },
    }),
    /remains pending/,
  );
  assert.equal(s.snapshot("a").jobs[0].status, "pending");
  const result = await s.fulfill("a", one.job, new SandboxProvider());
  assert.equal(result.mode, "sandbox");
  assert.deepEqual(
    await s.fulfill("a", one.job, {
      fulfill: () => {
        throw Error("should not call");
      },
    }),
    result,
  );
  s.close();
});
test("insufficient inventory never spends shards; invalid odds fail validation", () => {
  const s = setup({ roll: () => 9999 });
  for (let i = 0; i < 10; i++)
    s.open("a", s.awardVictory("a", `b${i}`, BIG).id);
  s.db.exec("UPDATE treasury SET inventory=0");
  assert.throws(() => s.redeem("a", "redemption-key"), /unavailable/);
  assert.equal(s.snapshot("a").shards, 1000);
  assert.throws(
    () =>
      validateConfig({ ...REWARDS, tiers: [{ cardBps: 10001, shards: 1 }] }),
    /Invalid tier/,
  );
  s.close();
});
test("official development adapter uses stable opaque refs and validates response", async () => {
  let body;
  const p = new CollectorCryptDevelopment({
    apiKey: "test",
    packType: "test-machine",
    fetcher: async (url, opts) => {
      assert.equal(
        url,
        "https://dev-gacha.collectorcrypt.com/api/v1/packs/instant",
      );
      body = JSON.parse(opts.body);
      assert.equal(opts.headers["x-api-key"], "test");
      return {
        ok: true,
        json: async () => ({
          results: [
            {
              status: 200,
              success: true,
              nftAddress: "dev-nft",
              memo: "dev-memo",
              cardName: "Test",
            },
          ],
        }),
      };
    },
  });
  assert.equal(
    (await p.fulfill({ id: "stable-id", playerRef: "opaque-player" })).memo,
    "dev-memo",
  );
  assert.equal(body.clientRef, "stable-id");
  const bad = new CollectorCryptDevelopment({
    apiKey: "x",
    packType: "x",
    fetcher: async () => ({
      ok: true,
      json: async () => ({ results: [{ status: 202 }] }),
    }),
  });
  await assert.rejects(bad.fulfill({ id: "x", playerRef: "y" }), /pending/);
});
test("challenge rejects client victory claims and stale commands cannot advance battle", () => {
  const s = setup(),
    a = new BossAuthority(s),
    f = a.start("owner", 1);
  assert.throws(
    () => a.action("owner", { id: f.id, sequence: 0, action: { type: "win" } }),
    /Invalid/,
  );
  const n = a.action("owner", {
    id: f.id,
    sequence: 0,
    action: { type: "move", index: 0 },
  });
  assert.equal(
    a.action("owner", {
      id: f.id,
      sequence: 0,
      action: { type: "move", index: 0 },
    }).sequence,
    n.sequence,
  );
  assert.equal(s.snapshot("owner").packs.length, 0);
  assert.throws(
    () =>
      a.action("other", {
        id: f.id,
        sequence: 0,
        action: { type: "move", index: 0 },
      }),
    /expired/,
  );
  s.close();
});
test("server battle player earns exactly one pack through a complete guardian victory", () => {
  const s = setup(),
    a = new BossAuthority(s);
  let f = a.start("owner", 7),
    steps = 0;
  // Use the same public action interface as the browser, with deterministic battle RNG.
  a.fights.get("owner").battle.rng = () => 0.35;
  while (!f.battle.outcome && steps++ < 250) {
    const b = f.battle,
      p = b.party[b.pi],
      enemy = b.enemies[b.ei];
    let action;
    if (p.hp <= 0)
      action = { type: "switch", index: b.party.findIndex((q) => q.hp > 0) };
    else {
      let scores = p.moves.map((m) =>
        m.pp > 0
          ? (moveData(m.id).power || 0) *
            effectiveness(moveData(m.id).type, species(enemy.id).types)
          : -1,
      );
      action = { type: "move", index: scores.indexOf(Math.max(...scores)) };
    }
    f = a.action("owner", { id: f.id, sequence: f.sequence, action });
  }
  assert.equal(f.battle.outcome, "won");
  assert.ok(f.pack);
  assert.equal(s.snapshot("owner").packs.length, 1);
  a.action("owner", {
    id: f.id,
    sequence: f.sequence,
    action: { type: "move", index: 0 },
  });
  assert.equal(s.snapshot("owner").packs.length, 1);
  s.close();
});

test("database restart preserves settled packs and pending claims", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "kanto-reward-"));
  const db = join(dir, "rewards.sqlite");
  try {
    let s = new RewardStore(db, { config: STATIC, roll: () => 0 });
    const p = s.awardVictory("a", "b", TIER);
    const result = s.open("a", p.id);
    s.close();
    s = new RewardStore(db, { config: STATIC, roll: () => 9999 });
    assert.deepEqual(s.open("a", p.id), result);
    assert.equal(s.snapshot("a").jobs[0].status, "pending");
    s.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
