# Architecture and editing guide

## Two distinct progress systems

The browser adventure imports story, world, renderer and battle-engine modules. `app.mjs` coordinates DOM input and local saves. Its named functions are grouped and formatted for editing. Start with the function for the interaction you want to change; battle mathematics belongs in the pure engine, not in UI callbacks.

The reward ladder uses the same battle engine on Node.js. Browser requests contain actions, not victory claims or balances. The server supplies the challenge teams and random rolls, checks each action and issues a pack only after its own Battle object reaches victory. It never reads localStorage or imported adventure saves.

## Rewards request path

1. `dist/rewards.mjs` requests a guardian challenge.
2. `server/index.mjs` identifies the local device from an HttpOnly cookie and hashes its opaque token into an account ID.
3. `server/rewards/bosses.mjs` owns the battle. A sequence counter prevents repeated button requests from taking multiple turns.
4. On victory, `server/rewards/store.mjs` atomically records a unique battle claim, pack, daily usage, inventory reservation and budget commitment.
5. Opening settles one stored outcome inside a SQLite transaction. The reveal animation follows settlement. Refreshing/replaying uses the saved result.
6. A card win or shard exchange creates one fulfillment job. Provider retries reuse the same job ID as Collector Crypt's `clientRef`.

## Directory conventions

- `dist/`: hand-edited client source and bundled assets, served to the browser.
- `server/`: never served statically; trusted state, provider calls and credentials.
- `config/`: explicit server-only sample reward policy.
- `src/`: Python tools that prepare data and art, not the browser entry point.
- `tests/`: automated verification; tests may use in-memory databases and forced random rolls.
- `audit/`: recorded campaign audit and legally earned checkpoint fixtures.
- `.data/`: ignored runtime databases. Preserve when restarting the local server.

## Before changing rewards

Keep ownership checks inside the store, not only HTTP handlers. Every pack or redemption mutation must stay transactional. Do not accept client-supplied odds, shard balances, tier levels or `won: true`. Do not move partner keys into client code.

## Public deployment boundary

The existing static Site remains adventure-only. This repository adds a local Node service; copying just `dist/` to static hosting does not host reward APIs. Deploying rewards publicly requires a persistent Node-compatible backend or a deliberate database/Worker migration. Never expose the supplied loopback development server by changing its bind address as a shortcut to real rewards.
