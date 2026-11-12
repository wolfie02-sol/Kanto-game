export let DATA;
export function setData(data) {
  DATA = data;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const species = (id) => DATA.pokemon[id];
export const moveData = (id) => DATA.moves[id];
export const expAt = (p, l) =>
  DATA.experience[species(p.id).growth][Math.min(100, l)];
export const hasUsableMoves = (p) =>
  p.moves.some((m) => m.pp > 0 && m.id !== p.disabled);
export const SPECIAL = [
  "fire",
  "water",
  "grass",
  "electric",
  "ice",
  "psychic",
  "dragon",
];
const chart = {
  normal: { rock: 0.5, ghost: 0 },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    rock: 0.5,
    dragon: 0.5,
  },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: {
    water: 2,
    electric: 0.5,
    grass: 0.5,
    ground: 0,
    flying: 2,
    dragon: 0.5,
  },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
  },
  ice: { water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2 },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
  },
  poison: { grass: 2, poison: 0.5, ground: 0.5, bug: 2, rock: 0.5, ghost: 0.5 },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
  },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 2,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
  },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2 },
  ghost: { normal: 0, psychic: 0, ghost: 2 },
  dragon: { dragon: 2 },
};
export const typesOf = (p) => p.types || species(p.id).types;
export const effectiveness = (type, types) =>
  types.reduce((n, t) => n * (chart[type]?.[t] ?? 1), 1);
export function stat(p, index) {
  let b = species(index === 0 && p.transformed ? p.transformed : p.id).base[
    index
  ];
  return (
    Math.floor(((b + 8) * 2 * p.level) / 100) + (index === 0 ? p.level + 10 : 5)
  );
}
export function freshVolatile(p) {
  if (p.transformed) {
    p.id = p.transformed;
    p.moves = p.originalMoves;
    delete p.transformed;
    delete p.originalMoves;
  }
  delete p.types;
  p.readyCharge = false;
  p.mist = false;
  p.lastMove = null;
  p.lastDamage = 0;
  p.stages = {};
  p.confusion = 0;
  p.seed = false;
  p.sub = 0;
  p.disabled = null;
  p.recharge = false;
  p.charge = null;
  p.reflect = false;
  p.screen = false;
  p.focus = false;
  return p;
}
export function makeMon(id, level) {
  let p = { id, level, xp: 0, hp: 0, status: "", sleep: 0, moves: [] };
  p.xp = expAt(p, level);
  let list = species(id)
    .learn.filter((x) => x[0] <= level)
    .map((x) => x[1]);
  list = [...new Set(list)];
  if (!list.length) list = [33];
  p.moves = list.slice(-4).map((id) => ({ id, pp: moveData(id).pp }));
  p.hp = stat(p, 0);
  return freshVolatile(p);
}
export function heal(p) {
  freshVolatile(p);
  p.hp = stat(p, 0);
  p.status = "";
  p.sleep = 0;
  p.moves.forEach((m) => (m.pp = moveData(m.id).pp));
  freshVolatile(p);
}
export function gainExp(p, amount) {
  if (p.transformed) {
    // Experience, learnsets and evolution belong to the real species, not the copy.
    let copy = p.id,
      copyMoves = p.moves;
    p.id = p.transformed;
    p.moves = p.originalMoves;
    delete p.transformed;
    try {
      return gainExp(p, amount);
    } finally {
      p.transformed = p.id;
      p.originalMoves = p.moves;
      p.id = copy;
      p.moves = copyMoves;
    }
  }
  let logs = [];
  p.xp += amount;
  while (p.level < 100 && p.xp >= expAt(p, p.level + 1)) {
    let old = stat(p, 0);
    p.level++;
    p.hp += stat(p, 0) - old;
    logs.push(`${species(p.id).name} grew to level ${p.level}!`);
    for (let [l, id] of species(p.id).learn.filter((x) => x[0] === p.level)) {
      if (!p.moves.some((m) => m.id === id)) {
        if (p.moves.length < 4) {
          p.moves.push({ id, pp: moveData(id).pp });
          logs.push(`${species(p.id).name} learned ${moveData(id).name}!`);
        } else {
          p.learnQueue ??= [];
          if (!p.learnQueue.includes(id)) p.learnQueue.push(id);
          logs.push(
            `${species(p.id).name} wants to learn ${moveData(id).name}! Choose a move after battle.`,
          );
        }
      }
    }
    let evo = species(p.id).evolve.find(
      (e) => e.trigger === 1 && e.level && p.level >= e.level,
    );
    if (evo) {
      let name = species(p.id).name,
        hp = stat(p, 0);
      p.id = evo.id;
      p.hp += stat(p, 0) - hp;
      logs.push(`What? ${name} evolved into ${species(p.id).name}!`);
      for (let [l, id] of species(p.id).learn.filter(
        ([l]) => l >= evo.level && l <= p.level,
      )) {
        if (p.moves.some((m) => m.id === id) || p.learnQueue?.includes(id))
          continue;
        if (p.moves.length < 4) {
          p.moves.push({ id, pp: moveData(id).pp });
          logs.push(`${species(p.id).name} learned ${moveData(id).name}!`);
        } else {
          p.learnQueue ??= [];
          p.learnQueue.push(id);
          logs.push(
            `${species(p.id).name} wants to learn ${moveData(id).name}! Choose a move after battle.`,
          );
        }
      }
    }
  }
  return logs;
}
const factor = (n) => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
function effectiveStat(p, i, critical = false) {
  let n = stat(p, i);
  if (!critical) n *= factor(p.stages[i] || 0);
  if (i === 4 && p.status === "par") n /= 4;
  if (i === 1 && p.status === "brn") n /= 2;
  return Math.max(1, Math.floor(n));
}
export function damage(a, d, move, rng = Math.random, forceCrit = null) {
  let eff = effectiveness(move.type, typesOf(d));
  if (!eff) return { amount: 0, eff, critical: false };
  let critical =
    forceCrit ??
    rng() <
      Math.min(
        255,
        Math.floor(species(a.id).base[4] / 2) *
          (move.meta?.crit_rate ? 8 : 1) *
          (a.focus ? 0.25 : 1),
      ) /
        256;
  let special = SPECIAL.includes(move.type),
    atk = effectiveStat(a, special ? 3 : 1, critical),
    def = effectiveStat(d, special ? 3 : 2, critical);
  if (!critical && ((special && d.screen) || (!special && d.reflect))) def *= 2;
  let level = critical ? a.level * 2 : a.level;
  let n =
    Math.floor(
      Math.floor(
        (Math.floor((2 * level) / 5 + 2) * (move.power || 0) * atk) / def,
      ) / 50,
    ) + 2;
  if (typesOf(a).includes(move.type)) n = Math.floor(n * 1.5);
  n = Math.floor(n * eff);
  n = Math.floor((n * (217 + Math.floor(rng() * 39))) / 255);
  return { amount: Math.max(1, n), eff, critical };
}
export function captureChance(p, kind = "ball", rng = Math.random) {
  let r = Math.floor(
    rng() * (kind === "great" ? 201 : kind === "ultra" ? 151 : 256),
  );
  let status = ["slp", "frz"].includes(p.status) ? 25 : p.status ? 12 : 0;
  if (r < status) return true;
  r -= status;
  if (r > species(p.id).capture) return false;
  let f = Math.min(
    255,
    Math.floor(
      (stat(p, 0) * 255 * 4) /
        (Math.max(1, p.hp) * (kind === "great" ? 8 : 12)),
    ),
  );
  return Math.floor(rng() * 256) <= f;
}
function statusApply(a, d, status, logs, rng = Math.random, announce = false) {
  let t = typesOf(d);
  if (
    d.status ||
    d.sub ||
    (status === "psn" && t.includes("poison")) ||
    (status === "brn" && t.includes("fire")) ||
    (status === "frz" && t.includes("ice"))
  ) {
    if (announce) logs.push("But it failed!");
    return;
  }
  d.status = status;
  if (status === "slp") d.sleep = 1 + Math.floor(rng() * 7);
  logs.push(
    `${species(d.id).name} is ${{ psn: "poisoned", brn: "burned", par: "paralyzed", slp: "asleep", frz: "frozen" }[status]}!`,
  );
}
function hit(p, amount) {
  if (p.sub) {
    let d = Math.min(p.sub, amount);
    p.sub -= d;
    return d;
  }
  let d = Math.min(p.hp, amount);
  p.hp -= d;
  return d;
}
// Metronome and Mirror Move run another move through a one-slot moveset.
function callMove(a, d, id, logs, rng, depth) {
  let before = a.callerMoves ?? a.moves;
  a.callerMoves = before;
  a.moves = [{ id, pp: 1 }];
  let wasTransformed = a.transformed;
  try {
    useMove(a, d, 0, logs, rng, depth + 1);
  } finally {
    if (depth === 0) delete a.callerMoves;
    // A called Transform keeps the copied moveset; otherwise restore the real one.
    if (!a.transformed || wasTransformed) a.moves = before;
  }
}
function useMove(a, d, slot, logs, rng, depth = 0) {
  if (a.hp <= 0 || d.hp <= 0) return;
  let n = species(a.id).name;
  if (a.recharge) {
    a.recharge = false;
    logs.push(`${n} must recharge!`);
    return;
  }
  if (a.status === "slp") {
    a.sleep--;
    if (a.sleep <= 0) {
      a.status = "";
      logs.push(`${n} woke up!`);
    } else logs.push(`${n} is fast asleep.`);
    return;
  }
  if (a.status === "frz") {
    logs.push(`${n} is frozen solid!`);
    return;
  }
  if (a.status === "par" && rng() < 0.25) {
    logs.push(`${n} is fully paralyzed!`);
    return;
  }
  if (a.confusion) {
    a.confusion--;
    if (rng() < 0.5) {
      let v = damage(
        a,
        a,
        { power: 40, type: "unknown", meta: {} },
        rng,
        false,
      ).amount;
      a.hp = Math.max(0, a.hp - v);
      logs.push(`${n} hurt itself in confusion!`);
      return;
    }
    logs.push(`${n} is confused!`);
  }
  let owned = a.moves[slot];
  if (!owned || owned.pp <= 0 || a.disabled === owned.id) {
    owned = { id: 165, pp: 1 };
  }
  let id = a.charge || owned.id,
    m = moveData(id);
  if (!a.charge) owned.pp--;
  else a.charge = null;
  logs.push(`${n} used ${m.name}!`);
  a.lastMove = id;
  if (id === 118 && depth < 2) {
    let options = Object.keys(DATA.moves)
      .map(Number)
      .filter((x) => x !== 118 && x !== 165);
    let chosen = options[Math.floor(rng() * options.length)];
    callMove(a, d, chosen, logs, rng, depth);
    return;
  }
  if (id === 144) {
    if (!a.transformed) {
      a.transformed = a.id;
      a.originalMoves = a.callerMoves ?? a.moves;
    }
    a.id = d.id;
    a.moves = d.moves.map((m) => ({ id: m.id, pp: 5 }));
    logs.push(`${n} transformed into ${species(d.id).name}!`);
    return;
  }
  if ([13, 19, 76, 91, 130, 143].includes(id) && !a.readyCharge) {
    a.charge = id;
    a.readyCharge = true;
    logs.push(`${n} is charging up!`);
    return;
  }
  a.readyCharge = false;
  let acc =
    (((m.accuracy ?? 100) / 100) * factor(a.stages[7] || 0)) /
    factor(d.stages[8] || 0);
  if (m.accuracy && rng() >= Math.min(255 / 256, acc)) {
    logs.push("The attack missed!");
    if ([26, 136].includes(id)) hit(a, 1);
    if ([120, 153].includes(id)) a.hp = 0;
    return;
  }
  let target = m.target_id === 7 ? a : d;
  if (id === 86 && typesOf(d).includes("ground")) {
    logs.push("It had no effect!");
    return;
  }
  if (id === 138 && d.status !== "slp") {
    logs.push("But it failed! The target is not asleep.");
    return;
  }
  if (id === 54) {
    a.mist = true;
    logs.push(`${n} is protected by Mist!`);
    return;
  }
  if (id === 114) {
    freshVolatile(a);
    freshVolatile(d);
    a.status = "";
    d.status = "";
    logs.push("All stat changes were eliminated!");
    return;
  }
  if (id === 116) {
    a.focus = true;
    logs.push(`${n} is getting pumped!`);
    return;
  }
  if ([105, 135, 156].includes(id)) {
    if (a.hp >= stat(a, 0)) {
      logs.push("But it failed!");
      return;
    }
    a.hp = Math.min(
      stat(a, 0),
      a.hp + Math.floor(stat(a, 0) * (id === 156 ? 1 : 0.5)),
    );
    if (id === 156) {
      a.status = "slp";
      a.sleep = 3;
    }
    logs.push(`${n} recovered HP!`);
    return;
  }
  if (id === 164) {
    let cost = Math.floor(stat(a, 0) / 4);
    if (a.hp > cost && !a.sub) {
      a.hp -= cost;
      a.sub = cost;
      logs.push(`${n} made a substitute!`);
    } else logs.push("But it failed!");
    return;
  }
  if (id === 73) {
    if (!typesOf(d).includes("grass") && !d.seed && !d.sub) {
      d.seed = true;
      logs.push(`${species(d.id).name} was seeded!`);
    } else logs.push("But it failed!");
    return;
  }
  if (id === 50) {
    let last = d.lastMove || d.moves[0]?.id;
    d.disabled = last;
    logs.push(`${species(d.id).name}'s ${moveData(last).name} was disabled!`);
    return;
  }
  if ([113, 115].includes(id)) {
    a[id === 113 ? "screen" : "reflect"] = true;
    logs.push(`${n} raised its defenses!`);
    return;
  }
  if ([18, 46, 100].includes(id)) {
    logs.push("But it failed in this battle!");
    return;
  }
  if (id === 102 || id === 119) {
    let last = d.lastMove;
    if (last && last !== id && depth < 2)
      callMove(a, d, last, logs, rng, depth);
    else logs.push("But it failed!");
    return;
  }
  if (id === 160) {
    a.types = ["normal"];
    logs.push(`${n} became Normal-type!`);
    return;
  }
  let stageChanges = id === 74 ? [[4, 1]] : id === 81 ? [[6, -1]] : m.stages;
  if (
    stageChanges.length &&
    (!m.power || rng() < (m.effect_chance ?? 100) / 100)
  ) {
    for (let [s, c] of stageChanges) {
      let idx = { 2: 1, 3: 2, 4: 3, 5: 3, 6: 4, 7: 7, 8: 8 }[s];
      if (idx) {
        if (target.mist && c < 0) {
          logs.push("Mist prevents the change.");
          continue;
        }
        target.stages[idx] = clamp((target.stages[idx] || 0) + c, -6, 6);
        logs.push(
          `${species(target.id).name}'s ${{ 1: "Attack", 2: "Defense", 3: "Special", 4: "Speed", 7: "accuracy", 8: "evasion" }[idx]} ${c > 0 ? "rose" : "fell"}!`,
        );
      }
    }
  }
  let fixed = {
    49: 20,
    69: a.level,
    82: 40,
    101: a.level,
    149: Math.max(1, Math.floor(rng() * a.level * 1.5)),
    162: Math.max(1, Math.floor(d.hp / 2)),
    68: (a.lastDamage || 0) * 2,
  }[id];
  let isOHKO = [12, 32, 90].includes(id);
  if (m.power || fixed || isOHKO) {
    let count = m.meta.min_hits || 1;
    if (m.meta.max_hits > count) {
      let roll = rng();
      count = roll < 0.375 ? 2 : roll < 0.75 ? 3 : roll < 0.875 ? 4 : 5;
    }
    let total = 0,
      landed = 0;
    for (let j = 0; j < count && d.hp > 0; j++) {
      let result = damage(a, d, m, rng);
      if (result.eff === 0) {
        logs.push("It had no effect!");
        break;
      }
      let amount = isOHKO
        ? effectiveStat(a, 4) >= effectiveStat(d, 4)
          ? d.hp
          : 0
        : (fixed ?? result.amount);
      if (isOHKO && !amount) {
        logs.push("But it failed!");
        break;
      }
      landed++;
      let dealt = hit(d, amount);
      d.lastDamage = dealt;
      total += dealt;
      if (j === 0) {
        if (result.critical && !fixed) logs.push("A critical hit!");
        if (result.eff > 1) logs.push("It's super effective!");
        else if (result.eff < 1) logs.push("It's not very effective...");
      }
    }
    if (count > 1 && landed)
      logs.push(`Hit ${landed} time${landed === 1 ? "" : "s"}!`);
    if (m.meta.drain > 0) {
      a.hp = Math.min(
        stat(a, 0),
        a.hp + Math.max(1, Math.floor((total * m.meta.drain) / 100)),
      );
      logs.push(`${n} drained health!`);
    }
    if (m.meta.drain < 0 || id === 165) {
      hit(
        a,
        Math.max(
          1,
          Math.floor(total * (id === 165 ? 0.5 : -m.meta.drain / 100)),
        ),
      );
      logs.push(`${n} was hurt by recoil!`);
    }
    if ([120, 153].includes(id)) a.hp = 0;
    if (id === 63 && d.hp > 0) a.recharge = true;
  }
  let ail = m.meta.meta_ailment_id;
  let chance = m.power
    ? (m.effect_chance ?? m.meta.ailment_chance ?? 0) / 100
    : 1;
  if (d.hp > 0 && rng() < chance) {
    if (ail === 6) {
      if (!d.sub && !d.confusion) {
        d.confusion = 2 + Math.floor(rng() * 4);
        logs.push(`${species(d.id).name} became confused!`);
      } else if (!m.power) logs.push("But it failed!");
    } else if ({ 1: "par", 2: "slp", 3: "frz", 4: "brn", 5: "psn" }[ail])
      statusApply(
        a,
        d,
        { 1: "par", 2: "slp", 3: "frz", 4: "brn", 5: "psn" }[ail],
        logs,
        rng,
        !m.power,
      );
  }
  if (d.status === "frz" && m.type === "fire" && m.power) {
    d.status = "";
    logs.push(`${species(d.id).name} thawed out!`);
  }
}
export class Battle {
  constructor(party, enemies, trainer = null, rng = Math.random) {
    this.party = party;
    this.enemies = enemies;
    this.pi = party.findIndex((p) => p.hp > 0);
    this.ei = 0;
    this.participants = [this.pi];
    this.trainer = trainer;
    this.rng = rng;
    this.turns = 0;
    this.outcome = null;
    this.logs = [
      trainer
        ? `${trainer} challenges you!`
        : `A wild ${species(enemies[0].id).name} appeared!`,
    ];
    party.forEach(freshVolatile);
  }
  get player() {
    return this.party[this.pi];
  }
  get enemy() {
    return this.enemies[this.ei];
  }
  enemyMove() {
    let ms = this.enemy.moves
      .map((m, i) => ({ ...moveData(m.id), ...m, i }))
      .filter((m) => m.pp > 0 && m.id !== this.enemy.disabled);
    if (!ms.length) return 0;
    let rng = this.rng;
    let ranked = ms
      .map((m) => ({
        i: m.i,
        s:
          (m.power || 20) *
          effectiveness(m.type, typesOf(this.player)) *
          (typesOf(this.enemy).includes(m.type) ? 1.5 : 1) *
          (0.7 + rng() * 0.6),
      }))
      .sort((a, b) => b.s - a.s);
    return ranked[0].i;
  }
  act(action, bag) {
    if (this.outcome) return this.logs;
    let logs = [],
      forcedSwitch = false;
    let a = this.player,
      d = this.enemy;
    // Counter only answers damage taken this turn.
    a.lastDamage = 0;
    d.lastDamage = 0;
    if (a.hp <= 0 && action.type !== "switch")
      return (this.logs = ["Choose a healthy Pokémon."]);
    if (action.type === "switch") {
      let p = this.party[action.index];
      if (!p || p.hp <= 0 || p === a)
        return (this.logs = ["Choose a different healthy Pokémon."]);
      let wasFainted = a.hp <= 0;
      freshVolatile(a);
      this.pi = action.index;
      this.participants ??= [];
      if (!this.participants.includes(this.pi)) this.participants.push(this.pi);
      a = p;
      logs.push(`Go, ${species(a.id).name}!`);
      if (!wasFainted) useMove(d, a, this.enemyMove(), logs, this.rng);
      else forcedSwitch = true;
    } else if (action.type === "ball") {
      if (this.trainer)
        return (this.logs = ["You can't catch a trainer's Pokémon!"]);
      if (!bag.ball) return (this.logs = ["No Poké Balls left."]);
      bag.ball--;
      if (captureChance(d, "ball", this.rng)) {
        this.outcome = "caught";
        logs.push(`Gotcha! ${species(d.id).name} was caught!`);
        return (this.logs = logs);
      }
      logs.push("Oh no! The Pokémon broke free!");
      useMove(d, a, this.enemyMove(), logs, this.rng);
    } else if (action.type === "potion") {
      if (!bag.potion) return (this.logs = ["No Potions left."]);
      if (a.hp === stat(a, 0)) return (this.logs = ["HP is already full."]);
      bag.potion--;
      a.hp = Math.min(stat(a, 0), a.hp + 20);
      logs.push(`${species(a.id).name} recovered 20 HP!`);
      useMove(d, a, this.enemyMove(), logs, this.rng);
    } else if (action.type === "run") {
      if (this.trainer)
        return (this.logs = ["You can't run from a trainer battle!"]);
      this.escapes = (this.escapes || 0) + 1;
      let chance =
        (effectiveStat(a, 4) * 32) /
          Math.max(1, Math.floor(effectiveStat(d, 4) / 4)) +
        30 * this.escapes;
      if (this.rng() * 256 < chance) {
        this.outcome = "escaped";
        return (this.logs = ["Got away safely!"]);
      }
      logs.push("Couldn't escape!");
      useMove(d, a, this.enemyMove(), logs, this.rng);
    } else {
      let m = a.moves[action.index];
      if (!m) return (this.logs = ["Choose a move."]);
      if (m.pp <= 0 && hasUsableMoves(a))
        return (this.logs = ["No PP left for that move."]);
      if (a.disabled === m.id && hasUsableMoves(a))
        return (this.logs = ["That move is disabled."]);
      let ei = this.enemyMove(),
        em = d.moves[ei];
      let priority = moveData(m.id).priority || 0,
        ep = em ? moveData(em.id).priority || 0 : 0;
      let speed = effectiveStat(a, 4),
        es = effectiveStat(d, 4);
      let first =
        priority !== ep
          ? priority > ep
          : speed === es
            ? this.rng() < 0.5
            : speed > es;
      if (first) {
        useMove(a, d, action.index, logs, this.rng);
        useMove(d, a, ei, logs, this.rng);
      } else {
        useMove(d, a, ei, logs, this.rng);
        useMove(a, d, action.index, logs, this.rng);
      }
    }
    for (let [p, other] of forcedSwitch
      ? []
      : [
          [a, d],
          [d, a],
        ]) {
      if (p.hp <= 0) continue;
      if (["psn", "brn"].includes(p.status)) {
        p.hp = Math.max(0, p.hp - Math.max(1, Math.floor(stat(p, 0) / 16)));
        logs.push(
          `${species(p.id).name} is hurt by ${p.status === "psn" ? "poison" : "its burn"}!`,
        );
      }
      if (p.seed && p.hp > 0) {
        let amount = Math.min(p.hp, Math.max(1, Math.floor(stat(p, 0) / 16)));
        p.hp -= amount;
        other.hp = Math.min(stat(other, 0), other.hp + amount);
        logs.push("Leech Seed drained health!");
      }
    }
    if (d.hp <= 0) {
      logs.push(`${species(d.id).name} fainted!`);
      let exp = Math.floor(
        ((species(d.id).exp * d.level) / 7) * (this.trainer ? 1.5 : 1),
      );
      let eligible = (this.participants || [this.pi])
        .map((i) => this.party[i])
        .filter((p) => p && p.hp > 0);
      for (let participant of eligible) {
        let amount = Math.floor(exp / Math.max(1, eligible.length));
        logs.push(`${species(participant.id).name} gained ${amount} EXP.`);
        logs.push(...gainExp(participant, amount));
      }
      this.participants = [this.pi];
      this.ei++;
      if (this.ei >= this.enemies.length) {
        this.ei--;
        this.outcome = "won";
        logs.push(
          this.trainer
            ? `You defeated ${this.trainer}!`
            : "You won the battle!",
        );
      } else
        logs.push(`${this.trainer} sent out ${species(this.enemy.id).name}!`);
    }
    if (a.hp <= 0) {
      logs.push(`${species(a.id).name} fainted!`);
      // Knocking out the last opponent wins, even if your last Pokémon falls the same turn.
      if (!this.party.some((p) => p.hp > 0) && this.outcome !== "won") {
        this.outcome = "lost";
        logs.push("Your team needs rest. Returning to the Pokémon Center.");
      }
    }
    this.turns++;
    this.logs = logs;
    return logs;
  }
}
export function validateSave(s) {
  if (
    !s ||
    ![1, 2].includes(s.version) ||
    !Array.isArray(s.party) ||
    s.party.length > 6 ||
    (s.party.length === 0 &&
      !(
        s.version === 2 &&
        ["wake", "downstairs", "mom", "lab", "starter"].includes(s.storyStage)
      )) ||
    !Number.isInteger(s.zone) ||
    s.zone < 0 ||
    s.zone > 14 ||
    !Number.isInteger(s.x) ||
    s.x < 1 ||
    s.x > 28 ||
    !Number.isInteger(s.y) ||
    s.y < 1 ||
    s.y > 20 ||
    !Array.isArray(s.box) ||
    s.box.length > 1000 ||
    !Array.isArray(s.badges) ||
    !Array.isArray(s.seen) ||
    !Array.isArray(s.caught) ||
    !Array.isArray(s.defeated) ||
    !s.bag ||
    !Number.isFinite(s.money) ||
    s.money < 0
  )
    return false;
  if (
    s.version === 2 &&
    (!["outdoor", "bedroom", "living", "lab"].includes(s.scene) ||
      ![
        "wake",
        "downstairs",
        "mom",
        "lab",
        "starter",
        "rival",
        "ready",
      ].includes(s.storyStage) ||
      !["red", "leaf"].includes(s.appearance) ||
      typeof s.trainerName !== "string" ||
      s.trainerName.length < 1 ||
      s.trainerName.length > 12 ||
      /[<>"&]/.test(s.trainerName) ||
      typeof s.rivalName !== "string" ||
      s.rivalName.length > 12 ||
      /[<>"&]/.test(s.rivalName))
  )
    return false;
  if (
    s.version === 2 &&
    s.scene !== "outdoor" &&
    (s.x > 12 || s.y < 2 || s.y > 10)
  )
    return false;
  for (let k of ["ball", "potion", "stone"])
    if (!Number.isInteger(s.bag[k]) || s.bag[k] < 0) return false;
  if (
    s.visited &&
    (!Array.isArray(s.visited) ||
      !s.visited.every((i) => Number.isInteger(i) && i >= 0 && i < 15))
  )
    return false;
  if (
    s.lastCenter !== undefined &&
    (!Number.isInteger(s.lastCenter) || s.lastCenter < 0 || s.lastCenter > 14)
  )
    return false;
  if (
    !s.badges.every((i) => Number.isInteger(i) && i >= 0 && i < 8) ||
    new Set(s.badges).size !== s.badges.length ||
    ![...s.seen, ...s.caught].every((id) => species(id))
  )
    return false;
  return [...s.party, ...s.box].every(
    (p) =>
      ["", "psn", "par", "brn", "slp", "frz"].includes(p.status) &&
      species(p.id) &&
      Number.isInteger(p.level) &&
      p.level >= 1 &&
      p.level <= 100 &&
      Number.isFinite(p.xp) &&
      Number.isInteger(p.hp) &&
      p.hp >= 0 &&
      p.hp <= stat(p, 0) &&
      Array.isArray(p.moves) &&
      p.moves.length > 0 &&
      p.moves.length <= 4 &&
      (!p.learnQueue ||
        (Array.isArray(p.learnQueue) &&
          p.learnQueue.every((id) => moveData(id)))) &&
      p.moves.every(
        (m) =>
          moveData(m.id) &&
          Number.isInteger(m.pp) &&
          m.pp >= 0 &&
          m.pp <= moveData(m.id).pp,
      ),
  );
}
