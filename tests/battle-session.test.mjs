import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setData, makeMon, Battle } from "../dist/engine.mjs?v=2.6.2";
import { snapshotBattle, restoreBattle } from "../dist/battle-session.mjs";
setData(
  JSON.parse(
    readFileSync(new URL("../dist/assets/data.json", import.meta.url)),
  ),
);
const battle = () => {
  const b = new Battle([makeMon(79, 30)], [makeMon(78, 30)], null, () => 0.99);
  b.enemy.moves = [{ id: 45, pp: 40 }];
  b.meta = { kind: "wild" };
  return b;
};
test("failed escape attempts and battle progress survive save/reload", () => {
  const b = battle();
  b.act({ type: "run" }, { ball: 3, potion: 3 });
  assert.equal(b.outcome, null);
  const restored = restoreBattle(
    JSON.parse(JSON.stringify(snapshotBattle(b))),
    structuredClone(b.party),
    () => 0.99,
  );
  assert.ok(restored);
  assert.equal(restored.escapes, 1);
  assert.equal(restored.turns, b.turns);
  restored.act({ type: "run" }, { ball: 3, potion: 3 });
  assert.equal(restored.escapes, 2);
});
test("old snapshots without escape counters still resume", () => {
  const b = battle(),
    saved = snapshotBattle(b);
  delete saved.escapes;
  const restored = restoreBattle(saved, b.party);
  assert.ok(restored);
  assert.equal(restored.escapes, 0);
});
test("completed battles retain their pending outcome on reload", () => {
  const b = battle();
  b.enemy.hp = 0;
  b.outcome = "won";
  const restored = restoreBattle(
    JSON.parse(JSON.stringify(snapshotBattle(b))),
    b.party,
  );
  assert.equal(restored.outcome, "won");
  assert.equal(restored.enemy.hp, 0);
});
test("malformed indices, enemy HP and metadata cannot crash startup", () => {
  for (const mutate of [
    (s) => (s.pi = 0.5),
    (s) => (s.enemies[0].hp = -1),
    (s) => (s.meta = { kind: "gym", i: 99 }),
    (s) => (s.logs = null),
  ]) {
    const b = battle(),
      s = structuredClone(snapshotBattle(b));
    mutate(s);
    assert.equal(restoreBattle(s, b.party), null);
  }
  assert.equal(restoreBattle(null, []), null);
});
