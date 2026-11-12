import { Battle, species, moveData, stat } from "./engine.mjs?v=2.6.2";

/** Persist all turn counters, including failed escapes, for an exact battle resume. */
export function snapshotBattle(battle) {
  if (!battle) return null;
  return Object.fromEntries(
    [
      "enemies",
      "trainer",
      "pi",
      "ei",
      "participants",
      "turns",
      "escapes",
      "outcome",
      "logs",
      "meta",
    ].map((key) => [key, battle[key]]),
  );
}
/** Accept old snapshots but reject broken indices, opponents and settlement metadata. */
export function restoreBattle(saved, party, rng = Math.random) {
  const index = (n, list) => Number.isInteger(n) && n >= 0 && n < list.length;
  const moves = (list) =>
    Array.isArray(list) &&
    list.length > 0 &&
    list.length <= 4 &&
    list.every(
      (m) =>
        moveData(m.id) &&
        Number.isInteger(m.pp) &&
        m.pp >= 0 &&
        m.pp <= Math.max(5, moveData(m.id).pp),
    );
  const mon = (p) =>
    p &&
    species(p.id) &&
    Number.isInteger(p.level) &&
    p.level >= 1 &&
    p.level <= 100 &&
    Number.isInteger(p.hp) &&
    p.hp >= 0 &&
    p.hp <= stat(p, 0) &&
    moves(p.moves) &&
    (!p.transformed || (species(p.transformed) && moves(p.originalMoves)));
  try {
    if (
      !saved ||
      !Array.isArray(party) ||
      !party.length ||
      !party.every(mon) ||
      !Array.isArray(saved.enemies) ||
      !saved.enemies.length ||
      saved.enemies.length > 6 ||
      !saved.enemies.every(mon) ||
      !index(saved.pi, party) ||
      !index(saved.ei, saved.enemies) ||
      !Number.isSafeInteger(saved.turns) ||
      saved.turns < 0 ||
      ![null, "won", "lost", "caught", "escaped"].includes(
        saved.outcome ?? null,
      ) ||
      !Array.isArray(saved.logs) ||
      !saved.logs.every((s) => typeof s === "string") ||
      !["wild", "intro", "trainer", "gym", "league"].includes(
        saved.meta?.kind,
      ) ||
      (saved.meta.kind === "gym" &&
        (!Number.isInteger(saved.meta.i) ||
          saved.meta.i < 0 ||
          saved.meta.i > 7)) ||
      (saved.meta.kind === "trainer" &&
        (typeof saved.meta.key !== "string" ||
          !Number.isFinite(saved.meta.money) ||
          saved.meta.money < 0))
    )
      return null;
    return Object.assign(Object.create(Battle.prototype), saved, {
      party,
      rng,
      escapes:
        Number.isSafeInteger(saved.escapes) && saved.escapes >= 0
          ? saved.escapes
          : 0,
      participants: Array.isArray(saved.participants)
        ? [...new Set(saved.participants.filter((i) => index(i, party)))]
        : [saved.pi],
    });
  } catch {
    return null;
  }
}
