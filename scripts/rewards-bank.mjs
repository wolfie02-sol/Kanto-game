// Operator tool for the rewards bank. Runs on the server machine only; there is
// deliberately no HTTP endpoint for deposits.
//
//   npm run rewards:bank -- status
//   npm run rewards:bank -- deposit --reference <tx-id> --cents 125000 [--cards 3] [--kind fee|topup] [--note "..."]
//
// `fee` deposits are settled coin-fee income: they raise the bank balance AND the
// recent-fee signal. `topup` deposits only raise the balance. The reference must be
// unique (for example the on-chain transaction signature), so re-running the same
// command never counts income twice.
import { parseArgs } from "node:util";
import { mkdirSync } from "node:fs";
import { RewardStore } from "../server/rewards/store.mjs";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    reference: { type: "string" },
    cents: { type: "string", default: "0" },
    cards: { type: "string", default: "0" },
    kind: { type: "string", default: "fee" },
    note: { type: "string", default: "" },
  },
});
const command = positionals[0] || "status";
const whole = (name) => {
  if (!/^\d+$/.test(values[name]))
    throw Error(`--${name} must be a whole number`);
  return Number(values[name]);
};
mkdirSync(new URL("../.data/", import.meta.url), { recursive: true });
const store = new RewardStore(
  process.env.REWARDS_DB ||
    new URL("../.data/rewards.sqlite", import.meta.url).pathname,
);
try {
  if (command === "deposit") {
    const result = store.deposit({
      reference: values.reference,
      cents: whole("cents"),
      cards: whole("cards"),
      kind: values.kind,
      note: values.note,
    });
    console.log(
      result.duplicate
        ? `Already recorded ${result.reference}; nothing changed.`
        : `Recorded ${result.kind} deposit ${result.reference}: ${result.cents} cents, ${result.cards} cards.`,
    );
  } else if (command !== "status") throw Error(`Unknown command: ${command}`);
  const bank = store.bank();
  console.log(JSON.stringify(bank, null, 2));
  if (bank.enabled)
    console.log(
      store.config.tiers
        .map(
          (t) =>
            `${t.name.padEnd(9)} ${String(t.wins).padStart(4)} wins  base ${(t.cardBps / 100).toFixed(2)}%  →  now ${(store.oddsFor(t, bank) / 100).toFixed(2)}%`,
        )
        .join("\n"),
    );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  store.close();
}
