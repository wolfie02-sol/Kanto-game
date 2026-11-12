# Kanto Game

A Pokémon browser adventure with the original 151 Pokémon, a named-trainer opening at home, close-camera pixel-art exploration, catching, eight Gyms, the League, and a separate guardian rewards ladder.

**Rewards currently run in sandbox mode.** Packs, shards, card claims and retries work locally. No real cards, NFTs, token fees or shipments are issued. An optional Collector Crypt **development** API adapter is included. Production issuance is deliberately disabled.

## Run the game

1. Install **Node.js 24 or newer**.
2. Open a terminal in this repository and run `npm start`.
3. Visit **http://127.0.0.1:4173/**.

The game has no runtime npm dependencies. Run `npm ci` only if you want the formatter. Windows users can run the same npm commands from PowerShell.

Move with arrows/WASD; interact with E/Space; use the on-screen controls on a phone. Finish the opening and close any dialogue, then select **Packs & rewards** in the sidebar. Choose a supplied challenge team, defeat the guardians and rip your earned pack. Guardian wins climb a ten-tier ladder with better odds. Shards can be exchanged for a simulated random card; direct card wins and exchanges both appear under Card claims.

## Where to edit

| What you want to change                                         | Start here                                             |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| Opening story, names, room transitions, save migrations         | `dist/story.mjs`                                       |
| Exploration controls, dialogue, game menus, campaign settlement | `dist/app.mjs`                                         |
| Battle rules, damage, types, status, XP, evolution              | `dist/engine.mjs`                                      |
| Towns, routes, encounters, Gyms and League teams                | `dist/world.mjs`                                       |
| Camera and pixel-art drawing                                    | `dist/renderer.mjs`                                    |
| Page layout, close view, battle appearance                      | `dist/index.html`, `dist/style.css`, `dist/rework.css` |
| Rewards screen and pack reveal                                  | `dist/rewards.mjs`, `dist/rewards.css`                 |
| Pack tiers, sample odds, shard amounts and daily limit          | `config/rewards.mjs`                                   |
| Recording fee income and checking bank-adjusted odds            | `scripts/rewards-bank.mjs` (`npm run rewards:bank`)    |
| Trusted guardian challenges                                     | `server/rewards/bosses.mjs`                            |
| Transactional rewards ledger and balances                       | `server/rewards/store.mjs`                             |
| Collector Crypt development API                                 | `server/providers/collector-crypt.mjs`                 |
| HTTP routing and local session ownership                        | `server/index.mjs`                                     |
| Art/data generation and source notes                            | `src/`, `PROJECT_NOTES.md`                             |

`dist/` is the **editable browser source**, despite its historical name. There is no bundler or generated JavaScript build step. Do not edit files under `node_modules/`. See [architecture](docs/ARCHITECTURE.md) for data flow and [rewards](docs/REWARDS.md) for integration details.

## Commands

| Command                  | Purpose                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `npm start`              | Game plus SQLite sandbox rewards service                                  |
| `npm run start:static`   | Adventure only; rewards require the full server                           |
| `npm test`               | Battle, story, regression and rewards checks                              |
| `npm run build`          | Check every JavaScript module for syntax errors                           |
| `npm run rewards:bank`   | Show bank health and odds, or record a fee deposit (see docs/REWARDS.md)  |
| `npm run audit:campaign` | Nine deterministic engine campaign simulations; not a browser playthrough |
| `npm run format`         | Format source after `npm ci`                                              |
| `npm run prepare-data`   | Re-download and package Pokémon data; needs Python/network                |

## Saves and local data

Adventure progress stays in browser localStorage; export/import it through Settings. Version-two saves preserve older version-one adventures.

Reward accounts live in `.data/rewards.sqlite`, separately from adventure saves. An HttpOnly device cookie owns your reward account; clearing it loses access to that account. Back up the SQLite database **and preserve the browser cookie** when testing. This is a local development identity, not a public account system. Do not commit `.data/` or `.env`.

## Current limits

- The included HTTP server listens on loopback only. Public hosting requires real authentication, HTTPS, rate limits, persistent database storage and operational monitoring.
- Guardian fights run on the server; ordinary adventure saves are editable and cannot prove entitlement to real rewards. Active guardian fights expire after an hour or a server restart; already earned packs survive restarts.
- Collector Crypt development calls require a separately issued development partner key and eligible machine code. No provider calls were made during development; the adapter has mocked contract tests.
- Odds adapt to the rewards bank balance and recent fee income, but fees are entered by an operator with `npm run rewards:bank`; no live token-fee feed is connected. Each pack's odds are locked when earned. Real issuance remains disabled until funding, identity, custody and fulfillment requirements are complete.
- Battle mechanics follow a declared simplified Generation I ruleset; some specialized cartridge effects remain incomplete. See `audit/AUDIT_REPORT.md`.
- Campaign audits found excessive grinding in later progression. More story/trainer content and balance work remain.

This is an unofficial fan project. Pokémon names, designs and third-party art remain their owners' property; inclusion does not grant redistribution rights. Existing art/data source notes are retained in `PROJECT_NOTES.md` and generation scripts. Review rights before publishing a public game.
