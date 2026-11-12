// Seeded long-turn battle stress check: randomized rosters, moves, switches and healing.
import { readFileSync } from "node:fs";
import { setData, makeMon, Battle, stat } from "../dist/engine.mjs";
const data = JSON.parse(
  readFileSync(new URL("../dist/assets/data.json", import.meta.url)),
);
setData(data);
let seed = 262;
const rng = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
const pick = (n) => Math.floor(rng() * n);
const errors = [];
for (let run = 0; run < 2000; run++) {
  const mons = Array.from({ length: 4 }, () => {
    const p = makeMon(1 + pick(151), 1 + pick(100));
    p.moves = Array.from({ length: 4 }, () => {
      const id = 1 + pick(165);
      return { id, pp: data.moves[id].pp };
    });
    return p;
  });
  const b = new Battle(mons.slice(0, 2), mons.slice(2), "QA", rng),
    bag = { ball: 30, potion: 30 };
  const trail = [];
  for (let turn = 0; turn < 120 && !b.outcome; turn++) {
    try {
      const a =
        b.player.hp <= 0
          ? { type: "switch", index: b.pi ? 0 : 1 }
          : rng() < 0.1
            ? { type: "potion" }
            : { type: "move", index: pick(4) };
      trail.push({ a, p: b.player.id, e: b.enemy.id });
      b.act(a, bag);
      for (const p of mons) {
        if (!Number.isFinite(p.hp) || p.hp < 0 || p.hp > stat(p, 0))
          throw Error(`HP ${p.hp}/${stat(p, 0)} id ${p.id}`);
        for (const m of p.moves)
          if (!Number.isFinite(m.pp) || m.pp < 0) throw Error("PP");
      }
    } catch (e) {
      errors.push({
        run,
        turn,
        error: e.message,
        trail: trail.slice(-6),
        logs: b.logs,
        mons,
      });
      break;
    }
  }
  if (errors.length === 3) break;
}
console.log(JSON.stringify({ seed: 262, battles: 2000, errors }, null, 2));
if (errors.length) process.exitCode = 1;
