import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
const child = spawn(process.execPath, ["scripts/serve.mjs"], {
  env: { ...process.env, PORT: "48765" },
  stdio: ["ignore", "pipe", "pipe"],
});
try {
  let startup = await Promise.race([
    once(child.stdout, "data").then((x) => String(x[0])),
    once(child, "exit").then(() => {
      throw Error("Server exited before startup");
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(Error("Server startup timed out")), 5000).unref(),
    ),
  ]);
  assert(startup.includes("127.0.0.1:48765"));
  let base = "http://127.0.0.1:48765";
  let home = await fetch(base + "/");
  assert.equal(home.status, 200);
  assert((await home.text()).includes("Kanto Journey"));
  let data = await fetch(base + "/assets/data.json");
  assert.equal(data.status, 200);
  assert.equal(Object.keys((await data.json()).pokemon).length, 151);
  let script = await fetch(base + "/app.mjs", { method: "HEAD" });
  assert.equal(script.status, 200);
  assert(script.headers.get("content-type").includes("javascript"));
  assert.equal(await script.text(), "");
  assert.equal((await fetch(base + "/missing-file")).status, 404);
  assert.equal((await fetch(base + "/", { method: "POST" })).status, 405);
  assert.equal((await fetch(base + "/.git/config")).status, 404);
  console.log(
    "PASS local launch, homepage, 151-species data, module MIME/HEAD, missing paths, method restriction and repository isolation",
  );
} finally {
  child.kill("SIGTERM");
}
