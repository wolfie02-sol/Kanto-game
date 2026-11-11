import { test } from "node:test";
import assert from "node:assert/strict";
import { createWalker } from "../dist/locomotion.mjs";
test("idle remains on an exact tile without walking frames", () => {
  const w = createWalker();
  for (const t of [0, 16, 140, 1000, 9999])
    assert.deepEqual(w.update("room", 5, 6, t), {
      x: 120,
      y: 144,
      moving: false,
      phase: 0,
    });
});
test("30, 60 and 120 Hz produce identical positions and exact arrival", () => {
  const results = [];
  for (const hz of [30, 60, 120]) {
    const w = createWalker();
    w.update("room", 5, 6, 0);
    w.update("room", 6, 6, 100);
    for (let t = 100; t < 170; t += 1000 / hz) w.update("room", 6, 6, t);
    results.push(w.update("room", 6, 6, 170));
    assert.deepEqual(w.update("room", 6, 6, 240), {
      x: 144,
      y: 144,
      moving: false,
      phase: 1,
    });
    assert.equal(w.update("room", 6, 6, 9999).x, 144);
  }
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[1], results[2]);
  assert.equal(results[0].x, 132);
});
test("doors and teleports do not drift through the old room", () => {
  const w = createWalker();
  w.update("bedroom", 12, 9, 0);
  w.update("bedroom", 11, 9, 10);
  assert.deepEqual(w.update("living", 12, 4, 20), {
    x: 288,
    y: 96,
    moving: false,
    phase: 0,
  });
  assert.equal(w.update("living", 2, 4, 30).x, 48);
});
test("gait follows steps instead of global clock", () => {
  const w = createWalker();
  w.update("a", 1, 1, 0);
  assert.equal(w.update("a", 2, 1, 100).phase, 1);
  assert.equal(w.update("a", 2, 1, 239).phase, 1);
  assert.equal(w.update("a", 3, 1, 240).phase, 0);
  assert.equal(w.update("a", 3, 1, 380).moving, false);
});
