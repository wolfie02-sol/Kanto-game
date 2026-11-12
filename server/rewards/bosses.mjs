import { randomUUID, randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { setData, makeMon, Battle, stat } from "../../dist/engine.mjs";
setData(
  JSON.parse(
    readFileSync(new URL("../../dist/assets/data.json", import.meta.url)),
  ),
);

/** Separate challenge ladder. Teams, randomness, actions and victory are server-owned.
 * Adventure saves are never accepted as proof of reward eligibility.
 * Active fights are ephemeral; earned packs and balances live in SQLite.
 */
export class BossAuthority {
  constructor(store) {
    this.store = store;
    this.fights = new Map();
  }
  start(owner, starter) {
    if (![1, 4, 7].includes(starter))
      throw Error("Choose Bulbasaur, Charmander, or Squirtle");
    this.store.account(owner);
    this.store.canIssue(owner);
    if (this.fights.size > 1000) throw Error("Challenge capacity reached");
    const existing = this.fights.get(owner);
    if (existing) return this.view(existing);
    const tier = this.store.tier(owner),
      level = tier.level;
    const team = [starter === 1 ? 3 : starter === 4 ? 6 : 9, 25, 131].map(
      (id) => makeMon(id, level),
    );
    const enemies = [76, 94, 149].map((id) => makeMon(id, level));
    const battle = new Battle(
      team,
      enemies,
      `${tier.name} Guardian`,
      () => randomInt(0, 0x1000000) / 0x1000000,
    );
    const fight = {
      id: randomUUID(),
      tier,
      battle,
      bag: { potion: 3, ball: 0 },
      sequence: 0,
      touched: Date.now(),
    };
    this.fights.set(owner, fight);
    return this.view(fight);
  }
  action(owner, { id, sequence, action }) {
    const f = this.fights.get(owner);
    if (!f || f.id !== id) throw Error("Challenge expired; start a new one");
    if (sequence !== f.sequence) return this.view(f); // stale/double-click: return current state
    if (!["move", "switch", "potion"].includes(action?.type))
      throw Error("Invalid challenge action");
    if (
      ["move", "switch"].includes(action.type) &&
      (!Number.isInteger(action.index) || action.index < 0 || action.index > 5)
    )
      throw Error("Invalid action index");
    f.battle.act(action, f.bag);
    f.sequence++;
    f.touched = Date.now();
    if (f.battle.outcome === "won" && !f.pack)
      f.pack = this.store.awardVictory(owner, f.id, f.tier).id;
    return this.view(f);
  }
  /** The owner's unfinished challenge, so a reloaded page can resume it. */
  current(owner) {
    const f = this.fights.get(owner);
    return f ? this.view(f) : null;
  }
  abandon(owner) {
    this.fights.delete(owner);
  }
  prune() {
    for (const [owner, f] of this.fights)
      if (Date.now() - f.touched > 3600000) this.fights.delete(owner);
  }
  view(f) {
    const mon = (p) => ({
      name: p.name || "",
      id: p.id,
      level: p.level,
      hp: p.hp,
      maxHp: stat(p, 0),
      status: p.status,
      moves: p.moves,
    });
    return {
      id: f.id,
      sequence: f.sequence,
      tier: f.tier,
      battle: {
        party: f.battle.party.map(mon),
        enemies: f.battle.enemies.map(mon),
        pi: f.battle.pi,
        ei: f.battle.ei,
        outcome: f.battle.outcome,
        logs: f.battle.logs,
      },
      bag: f.bag,
      pack: f.pack,
    };
  }
}
