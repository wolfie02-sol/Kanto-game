# Packs, shards and Collector Crypt

## Implemented now

- Server-run guardian battles with three supplied Pokémon per side; separate from local adventure progression.
- Ten earned packs per device account per UTC day. Losing/abandoning does not use a pack allowance. This is a configurable sandbox policy.
- Trail, Summit and Champion tiers; promotion after 3 and 7 recorded guardian victories.
- Frozen, disclosed per-pack odds/config version. Each pack awards **either** shards **or** one card entitlement.
- Durable unopened/settled/revealed packs, CSPRNG outcome selection, exactly-once settlement, ownership checks and reload recovery.
- Atomic 1,000-shard redemption for a random card entitlement, with idempotent request references.
- Durable pending/fulfilled provider jobs; timeouts preserve entitlement and retries reuse stable references.
- SQLite funding reservations, inventory reservations for unopened packs, ledger events and finite sandbox reserves.
- A simulated provider and an optional adapter for the official Collector Crypt Invoiced Development API.

## Sample policy, not production economics

| Tier     | Wins required | Challenge level | Direct card chance | Shards otherwise |
| -------- | ------------: | --------------: | -----------------: | ---------------: |
| Trail    |             0 |              20 |                 1% |               50 |
| Summit   |             3 |              40 |                 2% |               75 |
| Champion |             7 |              65 |                 3% |              100 |

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
- An authoritative source of **settled** token-fee income. None is configured; client wallet balances or estimated trading volume are not funding evidence.
- An operator funding ledger with verified deposit idempotency, outstanding shard/card liabilities, reserve buffers, audit/recovery tooling and reconciliation after downtime.
- An approved issuance/odds policy with economic simulation and disclosure. Future dynamic odds must bind before pack issuance and must never rewrite existing entitlements.
- Abuse testing of server challenges and real-account eligibility; load testing, monitoring, database backups and restore drills.

The UI is intentionally labeled sandbox until this boundary is completed. Pack animation is cosmetic; entitlement is recorded first and never depends on an animation finishing.
