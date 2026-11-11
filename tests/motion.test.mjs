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

test("new scene is painted while covered before reveal", async () => {
  const events = [];
  const g = createSceneGate({
    cover: async () => events.push("cover"),
    paint: async () => events.push("paint"),
    uncover: async () => events.push("uncover"),
  });
  await g.run("door", () => events.push("commit"));
  assert.deepEqual(events, ["cover", "commit", "paint", "uncover"]);
});
test("essential opacity fade does not require Web Animations", async () => {
  const { fadeOpacity } = await import("../dist/motion.mjs");
  const e = {
    style: { opacity: "0" },
    animate() {
      throw Error("Must not call Web Animations");
    },
  };
  await fadeOpacity(e, 0, 1, 200);
  assert.equal(e.style.opacity, "1");
});
test("fade paints intermediate opacity and retains its final state", async () => {
  const { fadeOpacity } = await import("../dist/motion.mjs");
  const oldRAF = globalThis.requestAnimationFrame,
    oldCancel = globalThis.cancelAnimationFrame;
  let frame;
  globalThis.requestAnimationFrame = (f) => {
    frame = f;
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {};
  try {
    const e = { style: {} },
      done = fadeOpacity(e, 0, 1, 200);
    frame(100);
    frame(200);
    assert.equal(Number(e.style.opacity), 0.5);
    frame(300);
    await done;
    assert.equal(e.style.opacity, "1");
  } finally {
    if (oldRAF) globalThis.requestAnimationFrame = oldRAF;
    else delete globalThis.requestAnimationFrame;
    if (oldCancel) globalThis.cancelAnimationFrame = oldCancel;
    else delete globalThis.cancelAnimationFrame;
  }
});
