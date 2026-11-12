import { test } from "node:test";
import assert from "node:assert/strict";
import { world, ZONES } from "../dist/world.mjs";
import { revealFrame } from "../dist/wild-encounter.mjs";
import { createSceneGate } from "../dist/motion.mjs";

test("every area has reachable hidden-encounter habitat and a safe north-south trail", () => {
  for (const [zone, z] of ZONES.entries()) {
    const { tiles } = world(zone);
    const seen = new Set(["14,9"]),
      queue = [[14, 9]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          key = `${nx},${ny}`;
        if (
          tiles[ny]?.[nx] === undefined ||
          [1, 4, 5, 7].includes(tiles[ny][nx]) ||
          seen.has(key)
        )
          continue;
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
    assert.ok(queue.filter(([x, y]) => tiles[y][x] === 2).length >= 20, z.name);
    const grass = tiles.flat().filter((t) => t === 2).length;
    assert.ok(grass <= 90, `${z.name}: habitat must remain in small patches`);
    if (zone === 1) {
      assert.equal(tiles[10][6], 3); // Former rail-shaped fishing spot is ordinary path.
      assert.equal(tiles[11][6], 0); // Open shoreline beside the pond.
    }
    for (let y = 0; y < 22; y++)
      assert.equal(tiles[y][14], 3, `${z.name}: safe trail ${y}`);
  }
});

test("silhouette becomes the revealed opponent, with gentle reduced-motion frames", () => {
  assert.equal(revealFrame(0.2).revealed, false);
  assert.equal(revealFrame(0.7).revealed, true);
  assert.equal(revealFrame(1).rise, 0);
  for (const p of [0, 0.2, 0.6, 1]) {
    assert.equal(revealFrame(p, true).rustle, 0);
    assert.equal(revealFrame(p, true).rise, 0);
  }
});

test("wild reveal holds the scene lock and commits the same opponent once", async () => {
  const events = [],
    opponent = { id: 25 };
  let release;
  const gate = createSceneGate({
    cover: async () => events.push("cover"),
    paint: async () => events.push("paint"),
    uncover: async () => events.push("uncover"),
  });
  const run = gate.run(
    "battle",
    () => events.push(opponent.id),
    async () => {
      events.push(`reveal:${opponent.id}`);
      await new Promise((r) => (release = r));
      return () => events.push("cleanup");
    },
  );
  assert.equal(gate.locked, true);
  assert.equal(await gate.run("battle", () => events.push("duplicate")), false);
  assert.deepEqual(events, ["reveal:25"]);
  release();
  await run;
  assert.deepEqual(events, [
    "reveal:25",
    "cover",
    "cleanup",
    25,
    "paint",
    "uncover",
  ]);
  assert.equal(gate.locked, false);
});
