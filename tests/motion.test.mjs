import { test } from "node:test";
import assert from "node:assert/strict";
import { animate, createSceneGate } from "../dist/motion.mjs";
test("a double-tapped door commits once under cover and always releases input", async () => {
  const events = [];
  let release;
  const gate = createSceneGate({
    onLock: () => events.push("lock"),
    cover: () =>
      new Promise((r) => {
        release = r;
      }),
    uncover: async () => events.push("uncover"),
    onUnlock: () => events.push("unlock"),
  });
  const first = gate.run("door", () => events.push("commit"));
  assert.equal(gate.locked, true);
  assert.equal(await gate.run("door", () => events.push("duplicate")), false);
  assert.deepEqual(events, ["lock"]);
  release();
  assert.equal(await first, true);
  assert.equal(gate.locked, false);
  assert.deepEqual(events, ["lock", "commit", "uncover", "unlock"]);
});
test("a failed scene commit cannot leave movement locked", async () => {
  let unlocked = false;
  const gate = createSceneGate({
    cover: async () => {},
    uncover: async () => {},
    onUnlock: () => {
      unlocked = true;
    },
  });
  await assert.rejects(
    gate.run("door", () => {
      throw Error("save failure");
    }),
    /save failure/,
  );
  assert.equal(gate.locked, false);
  assert.equal(unlocked, true);
});
test("reduced motion and missing animation support complete immediately", async () => {
  let called = false;
  await animate(
    {
      animate() {
        called = true;
      },
    },
    [],
    100,
    { reduced: () => true },
  );
  assert.equal(called, false);
  await animate({}, [], 100, { reduced: () => false });
});
test("cancelled or unsupported browser animation cannot prevent a transition", async () => {
  let cancelled = 0;
  await animate(
    {
      animate() {
        return {
          finished: Promise.reject(Error("cancelled")),
          cancel() {
            cancelled++;
          },
        };
      },
    },
    [],
    20,
    { reduced: () => false },
  );
  assert.equal(cancelled, 1);
  await animate(
    {
      animate() {
        throw Error("unsupported");
      },
    },
    [],
    20,
    { reduced: () => false },
  );
});
test("backgrounded animation has a bounded fallback and is cancelled afterwards", async () => {
  let cancelled = false;
  await animate(
    {
      animate() {
        return {
          finished: new Promise(() => {}),
          cancel() {
            cancelled = true;
          },
        };
      },
    },
    [],
    0,
    { reduced: () => false },
  );
  assert.equal(cancelled, true);
});
