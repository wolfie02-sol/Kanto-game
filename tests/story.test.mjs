import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  newAdventure,
  migrateAdventure,
  sanitizeName,
  roomWorld,
  roomTransition,
  storyObjective,
  ROOMS,
  STAGES,
} from "../dist/story.mjs";
import { cameraFor } from "../dist/renderer.mjs";
import { setData, makeMon, validateSave } from "../dist/engine.mjs";
import { world } from "../dist/world.mjs";
setData(
  JSON.parse(
    readFileSync(new URL("../dist/assets/data.json", import.meta.url)),
  ),
);
let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log("PASS", name);
}
check("A new named trainer starts at home without a Pokémon", () => {
  let s = newAdventure("LUCAS", "leaf", "BLUE");
  assert.equal(s.scene, "bedroom");
  assert.equal(s.trainerName, "LUCAS");
  assert.equal(s.appearance, "leaf");
  assert.equal(s.rivalName, "BLUE");
  assert.equal(s.party.length, 0);
  assert.equal(s.storyStage, "wake");
  assert(validateSave(s));
});
check("Pre-starter saves survive serialization at every opening stage", () => {
  for (let stage of STAGES.slice(0, 5)) {
    let s = newAdventure("LUCAS");
    s.storyStage = stage;
    s.scene =
      stage === "mom" ? "living" : stage === "starter" ? "lab" : "bedroom";
    assert(validateSave(JSON.parse(JSON.stringify(s))), stage);
    assert(storyObjective(s));
  }
});
check(
  "Legacy save migration preserves Pokémon, money, badges and location",
  () => {
    let old = {
      version: 1,
      party: [makeMon(7, 20)],
      box: [makeMon(16, 12)],
      money: 4200,
      bag: { ball: 4, potion: 2, stone: 1 },
      zone: 6,
      x: 14,
      y: 17,
      dir: "up",
      badges: [0],
      seen: [7, 16],
      caught: [7, 16],
      defeated: ["trainer-0"],
      visited: [0, 1, 2, 3, 4, 5, 6],
    };
    let before = JSON.stringify(old);
    let s = migrateAdventure(old);
    assert.equal(s.storyStage, "ready");
    assert.equal(s.scene, "outdoor");
    assert.equal(s.money, 4200);
    assert.equal(s.zone, 6);
    assert.deepEqual(s.party, old.party);
    assert.deepEqual(s.box, old.box);
    assert.deepEqual(s.badges, [0]);
    assert.equal(JSON.stringify(old), before);
    assert(validateSave(s));
  },
);
check("Names are safe, bounded and support international trainer names", () => {
  assert.equal(sanitizeName("Éloïse"), "Éloïse");
  assert.equal(sanitizeName("   "), "RED");
  assert.equal(sanitizeName("<script>"), "script");
  assert.equal(sanitizeName("ABCDEFGHIJKLMNOPQRSTUVWXYZ").length, 12);
  let s = newAdventure("RED");
  s.trainerName = "<img>";
  assert(!validateSave(s));
});
check("Empty parties are allowed only before receiving a starter", () => {
  let s = newAdventure();
  s.storyStage = "ready";
  assert(!validateSave(s));
  s.storyStage = "rival";
  assert(!validateSave(s));
  s.party = [makeMon(1, 5)];
  assert(validateSave(s));
});
check("Every room can reach its doors and interact with each object", () => {
  for (let scene of ROOMS) {
    let w = roomWorld(scene),
      start =
        scene === "bedroom" ? [5, 6] : scene === "living" ? [12, 4] : [7, 10],
      seen = new Set([start.join(",")]),
      todo = [start],
      blocked = [1, 4, 5, 7];
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
          a > 12 ||
          b < 2 ||
          b > 10 ||
          blocked.includes(w.tiles[b][a]) ||
          seen.has(key) ||
          w.objects.some(
            (o) =>
              o.x === a &&
              o.y === b &&
              ["mom", "oak", "rival"].includes(o.kind),
          )
        )
          continue;
        seen.add(key);
        todo.push([a, b]);
      }
    }
    for (let o of w.objects) {
      assert(
        [
          [o.x, o.y],
          [o.x - 1, o.y],
          [o.x + 1, o.y],
          [o.x, o.y - 1],
          [o.x, o.y + 1],
        ].some((p) => seen.has(p.join(","))),
        `${scene}: ${o.kind}`,
      );
    }
  }
});
check("Stairs and exterior doors land on walkable destinations", () => {
  for (let kind of ["stairs-down", "stairs-up", "home-exit", "lab-exit"]) {
    let t = roomTransition(kind),
      w = t.scene === "outdoor" ? world(t.zone) : roomWorld(t.scene);
    assert(![1, 4, 5, 7].includes(w.tiles[t.y][t.x]), kind);
  }
  assert.equal(world(0).objects.find((o) => o.kind === "home").x, 24);
});
check(
  "Following camera stays inside outdoor bounds and centers a smaller room",
  () => {
    assert.deepEqual(cameraFor({ x: 1, y: 1 }, 720, 528), { x: 0, y: 0 });
    let far = cameraFor({ x: 28, y: 20 }, 720, 528);
    assert.equal(far.x, 720 - 384);
    assert.equal(far.y, 528 - 288);
    assert.equal(cameraFor({ x: 7, y: 6 }, 336, 288).x, -24);
    let near = cameraFor({ x: 14, y: 10 }, 720, 528, 288, 216);
    assert.equal(near.x, 14 * 24 + 12 - 144);
    assert.equal(near.y, 10 * 24 + 12 - 108);
  },
);
check(
  "Version two rejects impossible room coordinates and unrecognized story stages",
  () => {
    let s = newAdventure();
    s.x = 25;
    assert(!validateSave(s));
    s.x = 5;
    s.storyStage = "teleport";
    assert(!validateSave(s));
    s.storyStage = "wake";
    s.scene = "unknown";
    assert(!validateSave(s));
  },
);
console.log(`\n${passed} story and camera checks passed.`);
