import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "kanto-http-"));
const child = spawn(process.execPath, ["server/index.mjs"], {
  env: {
    ...process.env,
    PORT: "48766",
    REWARDS_PROVIDER: "sandbox",
    REWARDS_DB: join(dir, "test.sqlite"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
try {
  await Promise.race([
    once(child.stdout, "data"),
    once(child, "exit").then(() => {
      throw Error("Server exited early");
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(Error("Server timeout")), 5000).unref(),
    ),
  ]);
  const base = "http://127.0.0.1:48766",
    r = await fetch(base + "/api/rewards");
  assert.equal(r.status, 200);
  const cookie = r.headers.get("set-cookie").split(";")[0];
  assert.match(r.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  const s = await r.json();
  assert.equal(s.mode, "sandbox");
  assert.equal(s.shards, 0);
  const post = (path, body, extra = {}) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, ...extra },
      body: JSON.stringify(body),
    });
  for (const junk of [null, [], 7]) {
    const bad = await post("/api/challenges/start", junk);
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error, "Invalid request");
  }
  assert.equal(
    (
      await post(
        "/api/challenges/start",
        { starter: 7 },
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await post("/api/challenges/start", { starter: 151 })).status,
    400,
  );
  const f = await (await post("/api/challenges/start", { starter: 7 })).json();
  assert.equal(f.battle.party.length, 3);
  const n = await (
    await post("/api/challenges/action", {
      id: f.id,
      sequence: 0,
      action: { type: "move", index: 0 },
    })
  ).json();
  assert.equal(n.sequence, 1);
  assert.equal((await post("/api/packs/open", { id: "invented" })).status, 400);
  assert.equal(
    (await fetch(base + "/server/providers/collector-crypt.mjs")).status,
    404,
  );
  assert.equal((await fetch(base + "/.env")).status, 404);
  assert.equal((await fetch(base + "/")).status, 200);
  console.log(
    "PASS reward HTTP identity, origin checks, authoritative challenge, ownership and secret isolation",
  );
} finally {
  child.kill("SIGTERM");
  await once(child, "exit");
  rmSync(dir, { recursive: true, force: true });
}
