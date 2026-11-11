import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
import {
  setData,
  species,
  makeMon,
  stat,
  damage,
  effectiveness,
  Battle,
  moveData,
  heal,
  gainExp,
  expAt,
  validateSave,
  captureChance,
} from "../dist/engine.mjs";
import { world, ZONES, GYMS, WATER } from "../dist/world.mjs";
let data = JSON.parse(
  readFileSync(new URL("../dist/assets/data.json", import.meta.url)),
);
setData(data);
let checks = 0;
const check = (desc, fn) => {
  fn();
  console.log("PASS", desc);
  checks++;
};
check("151 original Pokémon and all 302 local front/back sprites", () => {
  assert.equal(Object.keys(data.pokemon).length, 151);
  for (let i = 1; i <= 151; i++) {
    assert(
      existsSync(new URL(`../dist/assets/sprites/${i}.png`, import.meta.url)),
    );
    assert(
      existsSync(new URL(`../dist/assets/sprites/${i}b.png`, import.meta.url)),
    );
  }
});
check("Red/Blue types, Special, and move history are restored", () => {
  assert.deepEqual(species(35).types, ["normal"]);
  assert.deepEqual(species(81).types, ["electric"]);
  assert.equal(species(1).base[3], 65);
  assert.equal(moveData(2).type, "normal");
  assert.equal(moveData(16).type, "normal");
  assert.equal(moveData(33).power, 35);
});
check(
  "Generation I type interactions include Ghost/Psychic immunity and Bug/Poison weakness",
  () => {
    assert.equal(effectiveness("ghost", ["psychic"]), 0);
    assert.equal(effectiveness("bug", ["poison"]), 2);
    assert.equal(effectiveness("poison", ["bug"]), 2);
    assert.equal(effectiveness("ice", ["fire"]), 1);
    assert.equal(effectiveness("electric", ["ground"]), 0);
    assert.equal(effectiveness("water", ["rock", "ground"]), 4);
  },
);
check("Damage is positive, scales by level, and respects immunity", () => {
  let a = makeMon(7, 20),
    d = makeMon(74, 20);
  assert(
    damage(a, d, moveData(55), () => 0.5, false).amount >
      damage(a, d, moveData(33), () => 0.5, false).amount,
  );
  assert.equal(
    damage(makeMon(25, 10), d, moveData(84), () => 0.5, false).amount,
    0,
  );
});
check("Critical damage bypasses stat stages", () => {
  let a = makeMon(4, 30),
    d = makeMon(1, 30);
  a.stages[1] = -6;
  let normal = damage(a, d, moveData(10), () => 0.5, false);
  let crit = damage(a, d, moveData(10), () => 0.5, true);
  assert(crit.amount > normal.amount);
});
check(
  "Turns consume PP and trainer battles disallow catching and running without consuming resources",
  () => {
    let a = makeMon(1, 5),
      b = new Battle([a], [makeMon(16, 3)], "Youngster", () => 0.5),
      bag = { ball: 5, potion: 2 };
    b.act({ type: "ball" }, bag);
    assert.equal(bag.ball, 5);
    b.act({ type: "run" }, bag);
    assert.equal(b.outcome, null);
    let old = a.moves[0].pp;
    b.act({ type: "move", index: 0 }, bag);
    assert.equal(a.moves[0].pp, old - 1);
  },
);
check(
  "Fainted Pokémon cannot attack and a healthy partner can be selected",
  () => {
    let a = makeMon(1, 5),
      p = makeMon(4, 5),
      b = new Battle([a, p], [makeMon(16, 5)], null, () => 0.5);
    a.hp = 0;
    let pp = a.moves[0].pp;
    b.act({ type: "move", index: 0 }, { ball: 1, potion: 1 });
    assert.equal(pp, a.moves[0].pp);
    b.act({ type: "switch", index: 1 }, { ball: 1, potion: 1 });
    assert.equal(b.player, p);
    assert.equal(p.hp, stat(p, 0));
  },
);
check(
  "Poison, healing and depleted items preserve HP/inventory invariants",
  () => {
    let a = makeMon(7, 20),
      e = makeMon(129, 5),
      b = new Battle([a], [e], null, () => 0.5),
      bag = { ball: 0, potion: 1 };
    a.hp -= 10;
    a.status = "psn";
    b.act({ type: "potion" }, bag);
    assert.equal(bag.potion, 0);
    assert(a.hp <= stat(a, 0));
    let turns = b.turns;
    b.act({ type: "ball" }, bag);
    assert.equal(b.turns, turns);
  },
);
check(
  "Catching low-HP and sleeping Pokémon succeeds at a deterministic sample",
  () => {
    let p = makeMon(16, 4);
    p.hp = 1;
    assert(captureChance(p, "ball", () => 0.1));
    p.status = "slp";
    assert(captureChance(p, "ball", () => 0));
  },
);
check(
  "Experience levels the active Pokémon and evolves at the correct level",
  () => {
    let p = makeMon(1, 15);
    p.xp = expAt(p, 16) - 1;
    let logs = gainExp(p, 2);
    assert.equal(p.level, 16);
    assert.equal(p.id, 2);
    assert(logs.some((x) => x.includes("evolved")));
    assert(p.hp <= stat(p, 0));
    assert(p.moves.length <= 4);
  },
);
check("Healing restores PP, HP, status and battle stages", () => {
  let p = makeMon(7, 10);
  p.hp = 0;
  p.status = "par";
  p.stages[1] = -3;
  p.moves[0].pp = 0;
  heal(p);
  assert.equal(p.hp, stat(p, 0));
  assert.equal(p.status, "");
  assert.equal(p.moves[0].pp, moveData(p.moves[0].id).pp);
  assert.deepEqual(p.stages, {});
});
check("All 151 Pokémon and all learned moves can complete engine turns", () => {
  for (let id = 1; id <= 151; id++) {
    let p = makeMon(id, 50);
    for (let m of p.moves) {
      assert(moveData(m.id));
      let a = makeMon(id, 50);
      a.moves = [{ ...m }];
      let b = new Battle([a], [makeMon(143, 70)], null, () => 0.6);
      for (let t = 0; t < 4 && !b.outcome; t++)
        b.act({ type: "move", index: 0 }, { ball: 5, potion: 5 });
      assert(Number.isFinite(b.player.hp));
      assert(b.player.hp >= 0);
      assert(b.enemy.hp >= 0);
    }
  }
});
check("Every Generation I move executes without invalid HP", () => {
  for (let id of Object.keys(data.moves)) {
    let p = makeMon(151, 50);
    p.moves = [{ id: Number(id), pp: 10 }];
    let b = new Battle([p], [makeMon(143, 70)], null, () => 0.6);
    for (let t = 0; t < 4 && !b.outcome; t++)
      b.act({ type: "move", index: 0 }, { ball: 5, potion: 5 });
    assert(Number.isFinite(b.player.hp), `move ${id}`);
    assert(Number.isFinite(b.enemy.hp), `move ${id}`);
  }
});
check(
  "All connected maps have walkable entrance-to-exit paths and reachable services",
  () => {
    for (let i = 0; i < ZONES.length; i++) {
      let w = world(i),
        blocked = [1, 4, 5, 7],
        seen = new Set(["14,19"]),
        todo = [[14, 19]];
      while (todo.length) {
        let [x, y] = todo.shift();
        for (let [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          let a = x + dx,
            b = y + dy,
            key = `${a},${b}`;
          if (
            a < 1 ||
            a > 28 ||
            b < 1 ||
            b > 20 ||
            blocked.includes(w.tiles[b][a]) ||
            seen.has(key)
          )
            continue;
          seen.add(key);
          todo.push([a, b]);
        }
      }
      assert(seen.has("14,1"), ZONES[i].name);
      for (let obj of w.objects.filter((o) =>
        ["gym", "center", "mart", "league", "lab"].includes(o.kind),
      ))
        assert(seen.has(`${obj.x},${obj.y}`), `${ZONES[i].name} ${obj.kind}`);
    }
  },
);
check("Eight distinct Gym badges and original leaders are configured", () => {
  assert.equal(GYMS.length, 8);
  assert.equal(new Set(GYMS.map((g) => g.badge)).size, 8);
  for (let g of GYMS)
    for (let [id, l] of g.team) {
      assert(species(id));
      assert(l > 0);
    }
});
check(
  "Save validation accepts a valid game and rejects malformed progress",
  () => {
    let s = {
      version: 1,
      party: [makeMon(7, 5)],
      box: [],
      bag: { ball: 5, potion: 5, stone: 0 },
      zone: 0,
      x: 14,
      y: 17,
      money: 100,
      badges: [],
      seen: [7],
      caught: [7],
      defeated: [],
    };
    assert(validateSave(s));
    assert(!validateSave({ ...s, zone: 99 }));
    assert(!validateSave({ ...s, party: [] }));
    let bad = structuredClone(s);
    bad.party[0].moves[0].id = 9000;
    assert(!validateSave(bad));
    bad = structuredClone(s);
    bad.party[0].hp = 999;
    assert(!validateSave(bad));
  },
);

check("Transform is temporary and preserves the original HP stat", () => {
  let p = makeMon(132, 30),
    originalHP = stat(p, 0),
    originalMoves = structuredClone(p.moves),
    b = new Battle([p], [makeMon(25, 30)], null, () => 0.6);
  b.act({ type: "move", index: 0 }, { ball: 1, potion: 1 });
  assert.equal(p.id, 25);
  assert.equal(stat(p, 0), originalHP);
  heal(p);
  assert.equal(p.id, 132);
  assert.deepEqual(p.moves, originalMoves);
});
check("Experience is awarded only to healthy battle participants", () => {
  let a = makeMon(7, 20),
    p = makeMon(4, 20),
    unused = makeMon(1, 20),
    foe = makeMon(129, 2),
    b = new Battle([a, p, unused], [foe], null, () => 0.5),
    old = [a.xp, p.xp, unused.xp];
  b.act({ type: "switch", index: 1 }, { ball: 1, potion: 1 });
  for (let t = 0; t < 10 && !b.outcome; t++)
    b.act({ type: "move", index: 0 }, { ball: 1, potion: 1 });
  assert.equal(b.outcome, "won");
  assert(a.xp > old[0]);
  assert(p.xp > old[1]);
  assert.equal(unused.xp, old[2]);
});
check(
  "All original 151 are obtainable through encounters, starter gifts and evolution",
  () => {
    let have = new Set([1, 4, 7, ...WATER, ...ZONES.flatMap((z) => z.pool)]),
      last = -1;
    while (last !== have.size) {
      last = have.size;
      for (let id of have) for (let e of species(id).evolve) have.add(e.id);
    }
    assert.equal(have.size, 151);
  },
);
check(
  "A fifth learned move queues a player choice instead of deleting a move",
  () => {
    let p = makeMon(7, 21);
    p.moves = [
      { id: 33, pp: 35 },
      { id: 39, pp: 30 },
      { id: 55, pp: 25 },
      { id: 110, pp: 40 },
    ];
    p.xp = expAt(p, 22) - 1;
    let original = p.moves.map((m) => m.id);
    gainExp(p, 2);
    assert.deepEqual(
      p.moves.map((m) => m.id),
      original,
    );
    assert(p.learnQueue?.length > 0);
  },
);
console.log(`\n${checks} checks passed.`);
