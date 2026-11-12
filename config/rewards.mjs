/** SANDBOX tuning only. These are examples, not approved production economics. */
export const REWARDS = Object.freeze({
  version: "sandbox-v2",
  dailyLimit: 10,
  resetTimezone: "UTC",
  redemptionShards: 1000,
  cardCostCents: 5000,
  initialBudgetCents: 1000000,
  initialInventory: 200,
  // A long guardian ladder: each pack grants EITHER shards OR a card entitlement.
  // `wins` is the lifetime guardian victories needed; `cardBps` is the base card
  // chance in basis points (100 = 1%) before the bank multiplier below.
  tiers: [
    {
      id: "trail",
      name: "Trail",
      wins: 0,
      level: 20,
      cardBps: 100,
      shards: 50,
    },
    {
      id: "grove",
      name: "Grove",
      wins: 3,
      level: 26,
      cardBps: 120,
      shards: 55,
    },
    {
      id: "ridge",
      name: "Ridge",
      wins: 8,
      level: 32,
      cardBps: 140,
      shards: 60,
    },
    {
      id: "summit",
      name: "Summit",
      wins: 15,
      level: 38,
      cardBps: 165,
      shards: 65,
    },
    {
      id: "storm",
      name: "Storm",
      wins: 25,
      level: 44,
      cardBps: 190,
      shards: 70,
    },
    {
      id: "ember",
      name: "Ember",
      wins: 40,
      level: 50,
      cardBps: 220,
      shards: 75,
    },
    {
      id: "glacier",
      name: "Glacier",
      wins: 60,
      level: 56,
      cardBps: 250,
      shards: 80,
    },
    {
      id: "champion",
      name: "Champion",
      wins: 90,
      level: 62,
      cardBps: 285,
      shards: 90,
    },
    {
      id: "legend",
      name: "Legend",
      wins: 130,
      level: 68,
      cardBps: 325,
      shards: 100,
    },
    {
      id: "mythic",
      name: "Mythic",
      wins: 180,
      level: 75,
      cardBps: 375,
      shards: 110,
    },
  ],
  // Bank-adaptive odds. Bound when a pack is EARNED and stored on the pack;
  // later bank changes never rewrite an existing pack.
  //   reserveRatio = spendable bank / (targetReserveCards × cardCostCents)
  //   feeRatio     = fee deposits in the last windowDays / targetWindowFeeCents
  //   multiplier   = clamp(reserveWeight × reserveRatio + (1 − reserveWeight) × feeRatio)
  // Each ratio is capped at maxMultiplier before weighting.
  dynamicOdds: {
    enabled: true,
    targetReserveCards: 100,
    windowDays: 7,
    targetWindowFeeCents: 250000,
    reserveWeight: 0.6,
    minMultiplier: 0.5,
    maxMultiplier: 2,
    maxCardBps: 1000,
  },
});
const isInt = (n, min, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(n) && n >= min && n <= max;
export function validateConfig(c) {
  if (c.cardCostCents % c.redemptionShards !== 0)
    throw Error("Shard backing must use whole cents");
  if (!Number.isSafeInteger(c.dailyLimit) || c.dailyLimit < 1)
    throw Error("Invalid daily limit");
  if (!Array.isArray(c.tiers) || !c.tiers.length) throw Error("Invalid tier");
  let ids = new Set(),
    lastWins = -1;
  for (const t of c.tiers) {
    if (
      !Number.isInteger(t.cardBps) ||
      t.cardBps < 0 ||
      t.cardBps > 10000 ||
      !Number.isInteger(t.shards) ||
      t.shards < 1 ||
      t.shards > c.redemptionShards ||
      !isInt(t.wins, 0) ||
      t.wins <= lastWins ||
      !isInt(t.level, 1, 100) ||
      typeof t.id !== "string" ||
      !/^[a-z][a-z0-9-]{0,31}$/.test(t.id) ||
      ids.has(t.id)
    )
      throw Error("Invalid tier");
    ids.add(t.id);
    lastWins = t.wins;
  }
  if (c.tiers[0].wins !== 0) throw Error("The first tier must need 0 wins");
  const d = c.dynamicOdds;
  if (d && d.enabled) {
    const positive = (n) => Number.isFinite(n) && n > 0;
    if (
      !isInt(d.targetReserveCards, 1) ||
      !isInt(d.windowDays, 1, 365) ||
      !isInt(d.targetWindowFeeCents, 1) ||
      !(d.reserveWeight >= 0 && d.reserveWeight <= 1) ||
      !positive(d.minMultiplier) ||
      !positive(d.maxMultiplier) ||
      d.minMultiplier > d.maxMultiplier ||
      !isInt(d.maxCardBps, 0, 10000)
    )
      throw Error("Invalid dynamic odds");
  }
}
validateConfig(REWARDS);
