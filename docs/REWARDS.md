# Packs, shards and Collector Crypt

## Implemented now

- Server-run guardian battles with three supplied Pokémon per side; separate from local adventure progression.
- Ten earned packs per device account per UTC day. Losing/abandoning does not use a pack allowance. This is a configurable sandbox policy.
- A ten-tier guardian ladder, from Trail (0 wins) to Mythic (180 wins). Each tier raises the base card chance, the shard amount and the challenge level.
- Bank-adaptive odds: the card chance for a new pack is the tier's base chance × a bank multiplier calculated from the spendable bank balance and recent fee income.
- Frozen, disclosed per-pack odds/config version. The multiplier is locked into the pack when it is earned. Each pack awards **either** shards **or** one card entitlement.
- An operator-only command records fee income and top-ups. There is no web endpoint for deposits.
- Durable unopened/settled/revealed packs, CSPRNG outcome selection, exactly-once settlement, ownership checks and reload recovery.
- Atomic 1,000-shard redemption for a random card entitlement, with idempotent request references.
- Durable pending/fulfilled provider jobs; timeouts preserve entitlement and retries reuse stable references.
- SQLite funding reservations, inventory reservations for unopened packs, ledger events and finite sandbox reserves.
- A simulated provider and an optional adapter for the official Collector Crypt Invoiced Development API.

## Sample policy, not production economics

| Tier     | Wins required | Challenge level | Base card chance | Shards otherwise |
| -------- | ------------: | --------------: | ---------------: | ---------------: |
| Trail    |             0 |              20 |            1.00% |               50 |
| Grove    |             3 |              26 |            1.20% |               55 |
| Ridge    |             8 |              32 |            1.40% |               60 |
| Summit   |            15 |              38 |            1.65% |               65 |
| Storm    |            25 |              44 |            1.90% |               70 |
| Ember    |            40 |              50 |            2.20% |               75 |
| Glacier  |            60 |              56 |            2.50% |               80 |
| Champion |            90 |              62 |            2.85% |               90 |
| Legend   |           130 |              68 |            3.25% |              100 |
| Mythic   |           180 |              75 |            3.75% |              110 |

With the 10-pack daily limit, Mythic takes at least 18 days of guardian wins.

### Bank-adaptive odds

When a pack is earned, its card chance is `round(base × multiplier)`, capped at `maxCardBps` (10%). The multiplier comes from two signals:

- **Reserve ratio:** spendable bank balance ÷ (`targetReserveCards` × card cost). The sandbox target is 100 cards ($5,000).
- **Fee ratio:** fee deposits in the last `windowDays` (7) ÷ `targetWindowFeeCents` ($2,500). This follows coin trading volume, because fees grow with volume.

Each ratio is capped at the maximum multiplier, then `multiplier = 0.6 × reserve + 0.4 × fees`, clamped between ×0.5 and ×2. A healthy bank with strong recent fees raises odds; a drained bank with no recent fees lowers them. The sandbox starts at ×1.2: plenty of reserve and no fees yet.

The multiplier, both ratios and the base chance are stored with each pack. Later deposits never change an earned pack. Solvency does not depend on the odds: every unopened pack still reserves a whole card, and no pack is issued when the bank cannot cover one.

### Recording fee income

```
npm run rewards:bank -- status
npm run rewards:bank -- deposit --reference <tx-signature> --cents 125000 [--cards 3] [--kind fee|topup] [--note "week 46"]
```

`fee` deposits raise the balance and the fee signal; `topup` deposits (manual funding) raise only the balance; `--cards` adds card inventory. The reference must be unique, such as the on-chain transaction signature: repeating a command is a no-op, and reusing a reference with different amounts is refused. Run it on the server machine with the same `REWARDS_DB`. An automated fee feed should call `RewardStore.deposit()` with the same references, and only for **settled** fees.

Values are versioned in `config/rewards.mjs`. Changing a tier does not rewrite earned pack probabilities or shard amounts. Keep redemption cost and card funding unit stable for an existing database; changing these economic units requires a ledger migration, not an environment edit. Existing game saves are unaffected.

The sandbox starts with 1,000,000 simulated cents and 200 simulated cards. Each unopened pack reserves a whole 5,000-cent card plus one inventory slot. A shard outcome releases that slot and converts the funding commitment into five cents per shard. Direct wins retain their reservation. A shard exchange consumes already-backed shards and one available inventory slot; it never charges the funding pool twice. Fulfillment consumes its commitment; it does not restore spendable funds.

This deliberately conservative model stops new issuance when it cannot reserve a full card. It does not promise that inventory is always available for shard exchange; depleted stock leaves shards untouched. It is not an expected-value or token-revenue forecast.

## Test Collector Crypt development integration

Official source checked November 11, 2026: https://docs.collectorcrypt.com/gacha/invoiced-api

1. Obtain a **development** partner key and eligible machine code from Collector Crypt.
2. Copy `.env.example` to `.env`.
3. Set `REWARDS_PROVIDER=collector-crypt-development`, `CC_API_KEY` and `CC_PACK_TYPE`.
4. Restart with `npm start`. Earn a card entitlement or exchange shards; press Claim / retry.

The adapter sends `POST https://dev-gacha.collectorcrypt.com/api/v1/packs/instant` with `x-api-key`, an opaque `playerRef`, machine `packType` and stable job ID as `clientRef`. It checks the per-result status/success fields before recording fulfillment. A timeout, 202 or error remains pending; another click retries the same provider reference. Collector Crypt's documented idempotency prevents an ambiguous timeout from creating a new purchase on retry.

This flow gives a random card in **Collector Crypt development custody**; it does not send a production NFT to a wallet. No automatic buyback, shipment, payment or wallet-signing operation is included. API contract tests use mocks; no real or development account has been connected or billed by this implementation.

## Required before real rewards

Production mode is rejected at startup. There is no hidden flag that enables real issuance. Complete these concrete dependencies before implementing production support:

- Durable user accounts with account recovery, HTTPS sessions, authorization, anti-abuse/rate limiting and a production hosting/database plan. Device cookies and daily limits alone do not stop account farming.
- An approved Collector Crypt partner account, production machine eligibility, verified pricing/custody terms, funding, inventory, fulfillment reconciliation, and user delivery/shipping workflows.
- An authoritative source of **settled** token-fee income feeding `RewardStore.deposit()`. None is configured; deposits are entered by an operator. Client wallet balances or estimated trading volume are not funding evidence.
- An operator funding ledger with verified deposit idempotency, outstanding shard/card liabilities, reserve buffers, audit/recovery tooling and reconciliation after downtime.
- An approved issuance/odds policy with economic simulation and disclosure. Dynamic odds already bind at issuance and never rewrite existing entitlements; the sample targets and weights are untested economics.
- Legal review: real-value prizes with odds tied to a token may be regulated as gambling in some jurisdictions.
- Abuse testing of server challenges and real-account eligibility; load testing, monitoring, database backups and restore drills.

The UI is intentionally labeled sandbox until this boundary is completed. Pack animation is cosmetic; entitlement is recorded first and never depends on an animation finishing.
