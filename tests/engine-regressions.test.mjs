import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  setData,
  makeMon,
  Battle,
  stat,
  freshVolatile,
  gainExp,
  expAt,
  species,
  wildForm,
  nameOf,
} from "../dist/engine.mjs";
setData(
  JSON.parse(
    readFileSync(new URL("../dist/assets/data.json", import.meta.url)),
  ),
);
const bag = () => ({ ball: 5, potion: 5 });
const SPLASH = { id: 150, pp: 40 };
const fixed = (value) => () => value;

test("Mirror Move copying Transform keeps the user's real moveset", () => {
  let a = makeMon(17, 30), // Pidgeotto
    d = makeMon(132, 30); // Ditto
  a.moves = [
    { id: 119, pp: 20 },
    { id: 16, pp: 35 },
  ];
  d.moves = [{ id: 144, pp: 10 }];
  d.lastMove = 144;
  let b = new Battle([a], [d], null, fixed(0.01));
  d.lastMove = 144;
  // Pidgeotto is faster: Mirror Move copies the Transform Ditto used last turn.
  b.act({ type: "move", index: 0 }, bag());
  assert.equal(a.transformed, 17);
  assert.deepEqual(
    a.originalMoves.map((m) => m.id),
    [119, 16],
  );
  freshVolatile(a);
  assert.equal(a.id, 17);
  assert.deepEqual(
    a.moves.map((m) => m.id),
    [119, 16],
  );
});

test("Metronome that does not transform restores the real moveset", () => {
  let a = makeMon(35, 30),
    d = makeMon(129, 30);
  a.moves = [
    { id: 118, pp: 10 },
    { id: 1, pp: 35 },
  ];
  d.moves = [SPLASH];
  let b = new Battle([a], [d], null, fixed(0.3));
  b.act({ type: "move", index: 0 }, bag());
  assert.deepEqual(
    a.moves.map((m) => m.id),
    [118, 1],
  );
  assert.equal(a.moves[0].pp, 9);
  assert.equal(a.callerMoves, undefined);
});

test("a transformed Pokémon gains EXP as its own species", () => {
  let ditto = makeMon(132, 20);
  ditto.transformed = 132;
  ditto.originalMoves = ditto.moves;
  ditto.id = 6; // copied Charizard
  ditto.moves = [{ id: 53, pp: 5 }];
  let target = expAt({ id: 132 }, 22);
  gainExp(ditto, target - ditto.xp);
  assert.equal(ditto.level, 22);
  assert.equal(ditto.id, 6, "still transformed during battle");
  assert.equal(ditto.learnQueue, undefined, "no Charizard moves queued");
  freshVolatile(ditto);
  assert.equal(ditto.id, 132);
  assert.deepEqual(
    ditto.moves.map((m) => m.id),
    [144],
  );
});

test("the enemy never wastes a turn choosing its disabled move", () => {
  let a = makeMon(25, 30),
    d = makeMon(19, 30);
  d.moves = [
    { id: 33, pp: 35 },
    { id: 98, pp: 30 },
  ];
  let b = new Battle([a], [d], null, fixed(0.5));
  d.disabled = b.enemy.moves[b.enemyMove()].id;
  let chosen = b.enemy.moves[b.enemyMove()].id;
  assert.notEqual(chosen, d.disabled);
});

test("sending in a replacement after a faint is not an extra residual turn", () => {
  let a = makeMon(129, 5),
    spare = makeMon(7, 20),
    d = makeMon(19, 20);
  let b = new Battle([a, spare], [d], "Trainer Test", fixed(0.5));
  a.hp = 0; // the lead fainted at the end of the previous turn
  d.status = "psn";
  let hp = d.hp;
  b.act({ type: "switch", index: 1 }, bag());
  assert.equal(b.pi, 1);
  assert.equal(d.hp, hp);
});

test("each failed escape attempt raises the odds once", () => {
  let a = makeMon(129, 5),
    d = makeMon(101, 60);
  a.moves = [SPLASH];
  d.moves = [SPLASH];
  let b = new Battle([a], [d], null, fixed(0.99));
  b.act({ type: "run" }, bag());
  b.act({ type: "run" }, bag());
  assert.equal(b.escapes, 2);
  assert.equal(b.turns, 2);
});

test("multi-hit moves report the hits that actually landed", () => {
  let a = makeMon(15, 50),
    d = makeMon(10, 3);
  a.moves = [{ id: 41, pp: 20 }];
  d.moves = [SPLASH];
  let b = new Battle([a], [d], null, fixed(0.01));
  b.act({ type: "move", index: 0 }, bag());
  assert.ok(b.logs.includes("Hit 1 time!"), b.logs.join(" | "));
});

test("Counter ignores damage taken on earlier turns", () => {
  let a = makeMon(56, 30),
    d = makeMon(19, 30);
  a.moves = [{ id: 68, pp: 20 }];
  d.moves = [SPLASH];
  let b = new Battle([a], [d], null, fixed(0.5));
  a.lastDamage = 25; // left over from an earlier hit
  let hp = d.hp;
  b.act({ type: "move", index: 0 }, bag());
  assert.equal(d.hp, hp);
});

test("status moves say when they fail", () => {
  let a = makeMon(25, 30),
    d = makeMon(19, 30);
  a.moves = [{ id: 86, pp: 20 }];
  d.moves = [SPLASH];
  d.status = "slp";
  d.sleep = 5;
  let b = new Battle([a], [d], null, fixed(0.5));
  b.act({ type: "move", index: 0 }, bag());
  assert.ok(b.logs.includes("But it failed!"), b.logs.join(" | "));
});

test("Leech Seed on a Grass type fails visibly", () => {
  let a = makeMon(1, 30),
    d = makeMon(43, 30);
  a.moves = [{ id: 73, pp: 10 }];
  d.moves = [SPLASH];
  let b = new Battle([a], [d], null, fixed(0.5));
  b.act({ type: "move", index: 0 }, bag());
  assert.equal(d.seed, false);
  assert.ok(b.logs.includes("But it failed!"));
});

test("Recover fails at full HP", () => {
  let a = makeMon(137, 30),
    d = makeMon(129, 30);
  a.moves = [{ id: 105, pp: 20 }];
  d.moves = [SPLASH];
  let b = new Battle([a], [d], null, fixed(0.5));
  b.act({ type: "move", index: 0 }, bag());
  assert.ok(b.logs.includes("But it failed!"));
  assert.equal(a.hp, stat(a, 0));
});

test("a slower OHKO move fails with a message", () => {
  let a = makeMon(127, 20),
    d = makeMon(101, 60);
  a.moves = [{ id: 12, pp: 5 }];
  d.moves = [SPLASH];
  let b = new Battle([a], [d], null, fixed(0.01));
  b.act({ type: "move", index: 0 }, bag());
  assert.ok(d.hp > 0);
  assert.ok(b.logs.includes("But it failed!"), b.logs.join(" | "));
});

test("Explosion faints the user even when it misses", () => {
  let a = makeMon(74, 30),
    d = makeMon(19, 30);
  a.moves = [{ id: 153, pp: 5 }];
  d.moves = [SPLASH];
  d.stages[8] = 6; // maximum evasion
  let b = new Battle([a], [d], null, fixed(0.99));
  b.act({ type: "move", index: 0 }, bag());
  assert.equal(a.hp, 0);
  assert.equal(species(a.id).name, "Geodude");
});

test("knocking out the last opponent wins even if your last Pokémon falls too", () => {
  let a = makeMon(7, 30),
    d = makeMon(19, 5);
  a.moves = [{ id: 55, pp: 25 }];
  d.moves = [SPLASH];
  let b = new Battle([a], [d], "Trainer Test", fixed(0.5));
  a.status = "psn";
  a.hp = 1;
  b.act({ type: "move", index: 0 }, bag());
  assert.equal(a.hp, 0);
  assert.equal(b.outcome, "won");
  assert.ok(!b.logs.some((l) => l.includes("Returning to the Pokémon Center")));
});

test("wild evolved forms only appear at believable levels", () => {
  assert.equal(wildForm(130, 8), 129, "level-8 Gyarados is a Magikarp");
  assert.equal(wildForm(130, 25), 130);
  assert.equal(wildForm(135, 11), 133, "early Jolteon is an Eevee");
  assert.equal(wildForm(139, 10), 138, "Omastar before 40 is Omanyte");
  assert.equal(wildForm(3, 5), 1, "two stages back");
  assert.equal(wildForm(3, 20), 2);
  assert.equal(wildForm(25, 3), 25, "no pre-evolution in this generation");
});

test("battle text names a transformed Pokémon by its own species", () => {
  let ditto = makeMon(132, 20),
    foe = makeMon(74, 20);
  ditto.moves = [{ id: 144, pp: 10 }];
  foe.moves = [SPLASH];
  let b = new Battle([foe], [ditto], null, fixed(0.5));
  b.act({ type: "move", index: 0 }, bag());
  assert.equal(ditto.id, 74);
  assert.equal(nameOf(ditto), "Ditto");
  ditto.hp = 1;
  foe.moves = [{ id: 33, pp: 35 }];
  b.act({ type: "move", index: 0 }, bag());
  assert.ok(b.logs.includes("Ditto fainted!"), b.logs.join(" | "));
});
