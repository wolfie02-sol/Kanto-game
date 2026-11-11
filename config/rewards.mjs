/** SANDBOX tuning only. These are examples, not approved production economics. */
export const REWARDS = Object.freeze({
  version: "sandbox-v1",
  dailyLimit: 10,
  resetTimezone: "UTC",
  redemptionShards: 1000,
  cardCostCents: 5000,
  initialBudgetCents: 1000000,
  initialInventory: 200,
  // Each pack grants EITHER shards OR a card entitlement, never both.
  tiers: [
    {
      id: "trail",
      name: "Trail Pack",
      wins: 0,
      level: 20,
      cardBps: 100,
      shards: 50,
    },
    {
      id: "summit",
      name: "Summit Pack",
      wins: 3,
      level: 40,
      cardBps: 200,
      shards: 75,
    },
    {
      id: "champion",
      name: "Champion Pack",
      wins: 7,
      level: 65,
      cardBps: 300,
      shards: 100,
    },
  ],
});
export function validateConfig(c) {
  if (c.cardCostCents % c.redemptionShards !== 0)
    throw Error("Shard backing must use whole cents");
  if (!Number.isSafeInteger(c.dailyLimit) || c.dailyLimit < 1)
    throw Error("Invalid daily limit");
  for (const t of c.tiers) {
    if (
      !Number.isInteger(t.cardBps) ||
      t.cardBps < 0 ||
      t.cardBps > 10000 ||
      !Number.isInteger(t.shards) ||
      t.shards < 1 ||
      t.shards > c.redemptionShards
    )
      throw Error("Invalid tier");
  }
}
validateConfig(REWARDS);
