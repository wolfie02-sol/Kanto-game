import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DATA,
  setData,
  makeMon,
  Battle,
  stat,
  heal,
  freshVolatile,
  gainExp,
  expAt,
} from "../dist/engine.mjs";
setData(
  JSON.parse(
    readFileSync(new URL("../dist/assets/data.json", import.meta.url)),
  ),
);
let failed = 0,
  total = 0;
function check(n, f) {
  total++;
  try {
    f();
    console.log("PASS", n);
  } catch (e) {
    failed++;
    console.log("FAIL", n, ":", e.message);
  }
}
const bag = () => ({ ball: 5, potion: 5 });
check("Dream Eater fails against an awake opponent", () => {
  let a = makeMon(94, 50),
    d = makeMon(143, 50);
  a.moves = [{ id: 138, pp: 15 }];
  d.moves = [{ id: 150, pp: 40 }];
  let b = new Battle([a], [d], null, () => 0.5),
    hp = d.hp;
  b.act({ type: "move", index: 0 }, bag());
  assert.equal(d.hp, hp);
  assert(b.logs.some((l) => /failed|asleep/.test(l)));
});
check("Poison damages HP rather than a substitute", () => {
  let a = makeMon(7, 30),
    d = makeMon(129, 10),
    b = new Battle([a], [d], null, () => 0.5);
  a.status = "psn";
  a.sub = 20;
  a.moves = [{ id: 150, pp: 40 }];
  d.moves = [{ id: 150, pp: 40 }];
  let hp = a.hp;
  b.act({ type: "move", index: 0 }, bag());
  assert(a.hp < hp);
  assert.equal(a.sub, 20);
});
check("Switching clears charged-move, Mist, and previous-hit state", () => {
  let a = makeMon(4, 20);
  a.readyCharge = true;
  a.charge = 19;
  a.mist = true;
  a.lastMove = 68;
  a.lastDamage = 50;
  freshVolatile(a);
  assert(!a.readyCharge);
  assert(!a.mist);
  assert(!a.lastMove);
  assert(!a.lastDamage);
});
check(
  "Unavailable actions update visible battle feedback without advancing turns",
  () => {
    let b = new Battle(
      [makeMon(7, 10)],
      [makeMon(16, 5)],
      "Trainer",
      () => 0.5,
    );
    let logs = b.act({ type: "ball" }, bag());
    assert.deepEqual(b.logs, logs);
    assert.equal(b.turns, 0);
  },
);
check("Struggle remains available when only a disabled move has PP", () => {
  let a = makeMon(7, 30),
    d = makeMon(16, 10),
    b = new Battle([a], [d], null, () => 0.5);
  a.moves = [
    { id: 33, pp: 0 },
    { id: 39, pp: 5 },
  ];
  a.disabled = 39;
  let hp = d.hp;
  b.act({ type: "move", index: 0 }, bag());
  assert(b.turns > 0);
  assert(d.hp < hp);
  assert(b.logs.some((x) => x.includes("Struggle")));
});
check("Abra learns Confusion when evolving into Kadabra at level 16", () => {
  let p = makeMon(63, 15);
  p.xp = expAt(p, 16) - 1;
  gainExp(p, 2);
  assert.equal(p.id, 64);
  assert(p.moves.some((m) => m.id === 93) || p.learnQueue?.includes(93));
});
check("Evolution choices are unique for each original species", () => {
  for (let p of Object.values(DATA.pokemon)) {
    let keys = p.evolve.map((e) =>
      JSON.stringify([e.id, e.level, e.trigger, e.item]),
    );
    assert.equal(new Set(keys).size, keys.length, p.name);
  }
});
console.log(`${total - failed}/${total} audit regression checks pass.`);
if (failed) process.exitCode = 1;
