import { readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
function check(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, e.name);
    if (e.isDirectory() && e.name !== "assets") check(file);
    else if (e.name.endsWith(".mjs"))
      execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
  }
}
for (const dir of ["dist", "server", "config", "scripts", "tests"]) check(dir);
console.log("All JavaScript modules passed syntax checks.");
