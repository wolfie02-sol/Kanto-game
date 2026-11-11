import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  setData,
  makeMon,
  Battle,
  heal,
  stat,
  moveData,
  species,
  effectiveness,
  damage,
  validateSave,
} from "../dist/engine.mjs";
import { ZONES, GYMS, LEAGUE } from "../dist/world.mjs";
import { newAdventure } from "../dist/story.mjs";
setData(
  JSON.parse(
    readFileSync(new URL("../dist/assets/data.json", import.meta.url)),
  ),
);
const prng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
};
const fixed = (id, l, hp) =>
  ({ 49: 20, 69: l, 82: 40, 101: l, 162: hp / 2 })[id] || 0;
function power(id, level = 40) {
  let m = moveData(id);
  if ([120, 153, 165].includes(id)) return 0;
  return (
    (((((fixed(id, level, 90) || m.power || 0) * (m.accuracy ?? 100)) / 100) *
      (m.meta.min_hits || 1)) /
      ([13, 19, 76, 91, 130, 143].includes(id) ? 2 : 1)) *
    (m.meta.crit_rate ? 1.45 : 1)
  );
}
function learn(p) {
  while (p.learnQueue?.length) {
    let id = p.learnQueue.shift(),
      m = moveData(id),
      values = p.moves.map((x) => power(x.id, p.level)),
      replace = values.indexOf(Math.min(...values));
    let same = p.moves.findIndex(
      (x) => moveData(x.id).type === m.type && power(x.id, p.level) > 0,
    );
    if (same >= 0 && power(id, p.level) > power(p.moves[same].id, p.level))
      replace = same;
    if (power(id, p.level) > power(p.moves[replace].id, p.level))
      p.moves[replace] = { id, pp: m.pp };
  }
}
function score(p, foe, entry) {
  let md = moveData(entry.id);
  if (entry.pp <= 0 || p.disabled === entry.id) return -1;
  if (entry.id === 138 && foe.status !== "slp") return 0;
  if ([120, 153].includes(entry.id)) return 0;
  let eff = effectiveness(md.type, species(foe.id).types);
  let amount =
    fixed(entry.id, p.level, foe.hp) ||
    (md.power ? damage(p, foe, md, () => 0.5, false).amount : 0);
  return (
    ((amount * (md.accuracy ?? 100)) /
      100 /
      ([13, 19, 76, 91, 130, 143].includes(entry.id) ? 2 : 1)) *
    (md.meta.crit_rate ? 1.3 : 1) *
    (eff ? 1 : 0)
  );
}
function bestMove(p, foe) {
  return p.moves
    .map((m, i) => ({ i, s: score(p, foe, m) }))
    .sort((a, b) => b.s - a.s)[0].i;
}
function matchup(p, foe) {
  let attack = Math.max(...p.moves.map((m) => score(p, foe, m))),
    incoming = Math.max(...foe.moves.map((m) => score(foe, p, m)), 1);
  return (
    (attack *
      (p.status === "frz" ? 0.01 : 1) *
      Math.max(0.1, p.hp / stat(p, 0))) /
    Math.max(0.3, (incoming / stat(p, 0)) * 5)
  );
}
function run(starter, seed) {
  let rng = prng(seed),
    s = newAdventure("AUDIT", "red", "BLUE");
  s.storyStage = "ready";
  s.scene = "outdoor";
  s.party = [makeMon(starter, 5)];
  s.caught = [starter];
  s.seen = [starter];
  s.bag = { ball: 15, potion: 8, stone: 0 };
  let r = {
    starter: species(starter).name,
    seed,
    completed: false,
    battles: 0,
    wildBattles: 0,
    turns: 0,
    defeats: 0,
    healingVisits: 0,
    stalls: 0,
    captureAttempts: 0,
    captures: [],
    areas: [],
    bosses: [],
    roundTrips: 0,
  };
  function center() {
    s.party.forEach(heal);
    r.healingVisits++;
  }
  function reorder(index) {
    if (index > 0) [s.party[0], s.party[index]] = [s.party[index], s.party[0]];
  }
  function fight(enemies, name = null, catching = false, training = false) {
    let lead = training
      ? s.party.map((p, i) => ({ i, l: p.level })).sort((a, b) => a.l - b.l)[0]
          .i
      : s.party
          .map((p, i) => ({ i, s: matchup(p, enemies[0]) }))
          .sort((a, b) => b.s - a.s)[0].i;
    reorder(lead);
    let b = new Battle(s.party, enemies, name, rng);
    r.battles++;
    for (let turn = 0; turn < 1200 && !b.outcome; turn++) {
      let a = b.player,
        d = b.enemy,
        action;
      let healthy = s.party
        .map((p, i) => ({ p, i, s: matchup(p, d) }))
        .filter((x) => x.p.hp > 0);
      if (!a.hp) {
        action = {
          type: "switch",
          index: healthy.sort((a, b) => b.s - a.s)[0].i,
        };
      } else if (catching && d.hp / stat(d, 0) < 0.45 && s.bag.ball) {
        action = { type: "ball" };
        r.captureAttempts++;
      } else {
        let best = healthy.sort((a, b) => b.s - a.s)[0];
        if (
          best.i !== b.pi &&
          (!training || a.hp / stat(a, 0) < 0.25 || a.status === "frz") &&
          best.s > matchup(a, d) * 2 &&
          turn % 3 === 0
        )
          action = { type: "switch", index: best.i };
        else if (
          a.hp / stat(a, 0) < 0.2 &&
          s.bag.potion &&
          stat(a, 0) - a.hp >= 20
        )
          action = { type: "potion" };
        else {
          let index = bestMove(a, d);
          if (catching) {
            let options = a.moves
              .map((m, i) => ({ i, d: score(a, d, m) }))
              .filter((x) => x.d > 0 && x.d < d.hp * 0.7)
              .sort((a, b) => a.d - b.d);
            if (options.length) index = options[0].i;
            else if (s.bag.ball) {
              action = { type: "ball" };
              r.captureAttempts++;
            }
          }
          action ??= { type: "move", index };
        }
      }
      b.act(action, s.bag);
      r.turns++;
      for (let p of s.party)
        if (!Number.isFinite(p.hp) || p.hp < 0 || p.hp > stat(p, 0))
          throw Error("HP invariant failed");
    }
    if (!b.outcome) {
      r.stalls++;
      r.stallDetails ??= [];
      r.stallDetails.push({
        logs: b.logs,
        disabled: b.player.disabled,
        playerMovesAtStall: structuredClone(b.player.moves),
        trainer: name,
        player: species(b.player.id).name,
        enemy: species(b.enemy.id).name,
        playerStatus: b.player.status,
        enemyStatus: b.enemy.status,
        playerHP: b.player.hp,
        enemyHP: b.enemy.hp,
        playerMoves: b.player.moves,
        enemyMoves: b.enemy.moves,
      });
      b.outcome = "stalled";
    }
    if (b.outcome === "caught") {
      let p = b.enemy;
      s.party.push(p);
      s.caught.push(p.id);
      s.seen.push(p.id);
      r.captures.push({
        id: p.id,
        name: species(p.id).name,
        level: p.level,
        zone: s.zone,
      });
    } else if (b.outcome === "won") {
      if (!name) s.money += 30;
    } else {
      r.defeats++;
      s.money = Math.floor(s.money * 0.9);
    }
    s.party.forEach(learn);
    return b.outcome;
  }
  function supplies() {
    if (s.bag.ball < 5 && s.money >= 200) {
      s.money -= 200;
      s.bag.ball++;
    }
    for (let p of s.party) {
      let ev = species(p.id).evolve.find(
        (e) => e.trigger === 2 || (e.trigger === 3 && p.id === 25),
      );
      if (ev && s.money >= 2100) {
        s.money -= 2100;
        let hp = stat(p, 0);
        p.id = ev.id;
        p.hp += stat(p, 0) - hp;
        s.caught.push(p.id);
        s.seen.push(p.id);
      }
    }
  }
  function capture(id) {
    let z = ZONES[s.zone];
    if (!z.pool.includes(id)) throw Error("Capture outside encounter table");
    for (
      let tries = 0;
      tries < 30 && !s.party.some((p) => p.id === id);
      tries++
    ) {
      if (tries > 0) {
        while (Math.max(...s.party.map((p) => p.level)) < z.level[1] + 2)
          wild();
      }
      center();
      supplies();
      if (!s.bag.ball && s.money < 200) throw Error("Out of capture funds");
      let l = z.level[0] + Math.floor(rng() * (z.level[1] - z.level[0] + 1));
      fight([makeMon(id, l)], null, true);
      if (s.party.some((p) => p.id === id)) return;
    }
    throw Error(`Unable to catch ${id}`);
  }
  function wild() {
    let z = ZONES[s.zone],
      pool = z.pool.filter((id) => id < 144),
      id = pool[Math.floor(rng() * pool.length)],
      l = z.level[0] + Math.floor(rng() * (z.level[1] - z.level[0] + 1));
    center();
    r.wildBattles++;
    fight([makeMon(id, l)], null, false, true);
    supplies();
    if (r.wildBattles > 4500) throw Error("Excessive grind");
  }
  function roundtrip() {
    let parsed = JSON.parse(JSON.stringify(s));
    if (!validateSave(parsed)) throw Error("Save invariant failed");
    r.roundTrips++;
  }
  function boss(g, isLeague = false) {
    let max = Math.max(...g.team.map((x) => x[1])),
      target = max - 2,
      before = r.wildBattles,
      tries = 0,
      outcome;
    while (Math.min(...s.party.map((p) => p.level)) < target) wild();
    do {
      center();
      if (tries === 0 && starter === 1 && seed === 151) {
        mkdirSync(new URL("../audit/checkpoints/", import.meta.url), {
          recursive: true,
        });
        let cp = structuredClone(s);
        cp.x = 24;
        cp.y = 9;
        cp.dir = "up";
        let lead = cp.party
          .map((p, i) => ({
            i,
            s: matchup(p, makeMon(g.team[0][0], g.team[0][1])),
          }))
          .sort((a, b) => b.s - a.s)[0].i;
        if (lead > 0)
          [cp.party[0], cp.party[lead]] = [cp.party[lead], cp.party[0]];
        writeFileSync(
          new URL(
            "../audit/checkpoints/" +
              g.name.toLowerCase().replace(/[^a-z]+/g, "-") +
              ".json",
            import.meta.url,
          ),
          JSON.stringify(cp),
        );
      }
      outcome = fight(
        g.team.map(([id, l]) => makeMon(id, l)),
        g.name,
      );
      tries++;
      if (outcome !== "won") {
        target++;
        if (target > max + 8) break;
        while (Math.min(...s.party.map((p) => p.level)) < target) wild();
      }
    } while (outcome !== "won" && tries < 12);
    r.bosses.push({
      name: g.name,
      outcome,
      attempts: tries,
      trainingBattles: r.wildBattles - before,
      levels: s.party.map((p) => p.level),
    });
    if (outcome !== "won") throw Error(`Could not beat ${g.name}`);
    s.money += isLeague ? 5000 : g.money;
    supplies();
    roundtrip();
  }
  try {
    for (let zone = 0; zone < 15; zone++) {
      s.zone = zone;
      if (!s.visited.includes(zone)) s.visited.push(zone);
      r.areas.push(ZONES[zone].name);
      if (
        zone > 0 &&
        ZONES[zone - 1].gym !== undefined &&
        !s.badges.includes(ZONES[zone - 1].gym)
      )
        throw Error("Gate failed");
      for (let [captureZone, id] of [
        [3, 25],
        [4, 74],
        [6, 63],
        [8, 92],
        [14, 131],
      ])
        if (zone === captureZone) capture(id);
      if (zone < 14) {
        center();
        let l = ZONES[zone].level[1];
        let outcome = fight(
          [
            makeMon(ZONES[zone].pool[0], l),
            makeMon(ZONES[zone].pool[1], Math.max(3, l - 1)),
          ],
          `Trainer ${zone}`,
        );
        if (outcome === "won") {
          s.money += l * 60;
          s.defeated.push(`trainer-${zone}`);
        }
      }
      if (ZONES[zone].gym !== undefined) {
        let i = ZONES[zone].gym;
        boss(GYMS[i]);
        s.badges.push(i);
        s.bag.ball += 5;
        s.bag.potion += 2;
      }
      roundtrip();
    }
    for (let i = 0; i < 5; i++) {
      boss(LEAGUE[i], true);
      s.league = i < 4 ? i + 1 : 0;
    }
    s.champion = true;
    roundtrip();
    r.completed = true;
  } catch (e) {
    r.error = e.message;
  }
  r.party = s.party.map((p) => ({
    id: p.id,
    name: species(p.id).name,
    level: p.level,
  }));
  r.badges = s.badges.length;
  r.playTimeHoursModel = {
    fast: (r.turns * 2.5 + r.battles * 4 + r.healingVisits * 6 + 900) / 3600,
    relaxed:
      (r.turns * 5 + r.battles * 10 + r.healingVisits * 18 + 1800) / 3600,
  };
  r.assumptions = [
    "Engine simulation, not an interactive browser playthrough.",
    "All experience earned from engine battles, no XP/level injection.",
    "Catches five companions only from legal local encounter tables.",
    "Money spent on balls and 2100-cost stone/trade evolutions.",
    "Damage-oriented AI; free Center healing between battles as allowed by the app.",
    "Trains every party member to boss level minus two, then adapts on defeat.",
    "Travel, dialogue, optional exploration and reading pace are only modeled in the time range.",
  ];
  return r;
}
let runs = [];
for (let starter of process.env.AUDIT_STARTER
  ? [Number(process.env.AUDIT_STARTER)]
  : [1, 4, 7])
  for (let seed of process.env.AUDIT_SEED
    ? [Number(process.env.AUDIT_SEED)]
    : [151, 2026, 8675309]) {
    let r = run(starter, seed);
    runs.push(r);
    console.log(
      JSON.stringify({
        starter: r.starter,
        seed,
        completed: r.completed,
        battles: r.battles,
        wild: r.wildBattles,
        turns: r.turns,
        badges: r.badges,
        error: r.error,
        levels: r.party.map((p) => p.level),
        modelHours: r.playTimeHoursModel,
      }),
    );
  }
writeFileSync(
  new URL(
    process.env.AUDIT_SEED
      ? "../audit/debug-results.json"
      : "../audit/campaign-results.json",
    import.meta.url,
  ),
  JSON.stringify(
    { kind: "deterministic-mixed-team-engine-simulation", runs },
    null,
    2,
  ),
);
if (runs.some((r) => !r.completed)) process.exitCode = 1;
