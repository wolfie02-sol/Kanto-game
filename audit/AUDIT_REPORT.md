# Kanto Journey audit — build 2.0.1

## Outcome

The core RPG can reach the Champion in all nine deterministic mixed-team engine campaigns after this audit's fixes. The fresh opening, Brock badge settlement, forced switching, Champion victory/postgame unlock, and Champion persistence were also exercised in the running desktop browser. **This is not a claim that every interaction is glitch-free or that a continuous end-to-end browser playthrough was completed.**

Collector Crypt, packs, shards, redemption, card odds and Solana funding are absent. Those tests are **blocked/not applicable**, not passed and not a 0% odds result. See `docs/REWARDS_STATUS.md`.

## Reproduced and fixed defects

Each defect was first reproduced by a failing regression test, then the test passed after the fix.

| Priority | Defect | Corrected behavior |
| --- | --- | --- |
| P1 | Dream Eater damaged awake targets | It fails unless the target is asleep. |
| P1 | Poison/burn damaged Substitute HP | Residual status damage reduces the affected Pokémon's HP. Confusion self-damage also bypasses its own substitute. |
| P1 | Struggle could be rejected when only a disabled move retained PP | The engine and move menu now check for usable moves, allowing Struggle when all moves are unavailable. |
| P1 | Evolution skipped moves learned at the evolution threshold | Abra now learns Confusion when becoming Kadabra; late evolutions can learn newly available evolution-threshold moves, with the existing four-slot choice flow. |
| P2 | Switching retained charging/Mist/previous-hit flags | Temporary battle state is cleared when switching, healing or starting a battle. |
| P2 | Rejected actions left stale UI feedback | The returned rejection is now stored in the battle log without consuming a turn. |
| P2 | Duplicate upstream evolution records created duplicate choices | Eleven identical records were removed and asset preparation now deduplicates them. |

## Verification

- **36 automated checks passed:** 20 engine/data/map checks, 9 story/migration/room/camera checks, 7 audit regressions.
- All application modules and the new local-launch/test-player scripts passed syntax validation.
- Local-server smoke test passed: homepage, 151-species data, module MIME and HEAD, missing paths, disallowed methods, and repository-file isolation.
- All **15 area layouts** have automated entrance/exit and service reachability coverage; bedroom, living room and lab have room-object/door reachability coverage.
- Asset checks cover all 151 front and back sprites.
- No real card fulfillment, reward ledger, wallet transaction or token-income test was performed.

## Deterministic campaign player

The test player starts with a level-5 starter, catches companions from legal encounter tables, earns experience only from engine battles, learns moves through the regular queue, spends game currency on supplies/evolutions, and fights the configured gyms and League. It trains all teammates to two levels below the next boss, adapts after defeat, and uses free Center healing between battles as the app permits. It has a damage-oriented rather than strategically optimal policy.

| Starter | Seed | Result | Badges | Wild training battles | Turns | Defeats | Unresolved stalls |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bulbasaur | 151 | Complete | 8 | 1,876 | 11,501 | 4 | 0 |
| Bulbasaur | 2026 | Complete | 8 | 1,813 | 11,666 | 5 | 0 |
| Bulbasaur | 8675309 | Complete | 8 | 1,910 | 11,650 | 12 | 0 |
| Charmander | 151 | Complete | 8 | 2,092 | 12,033 | 8 | 0 |
| Charmander | 2026 | Complete | 8 | 2,041 | 11,652 | 8 | 0 |
| Charmander | 8675309 | Complete | 8 | 1,974 | 11,805 | 6 | 0 |
| Squirtle | 151 | Complete | 8 | 1,788 | 10,698 | 8 | 0 |
| Squirtle | 2026 | Complete | 8 | 1,687 | 11,559 | 18 | 0 |
| Squirtle | 8675309 | Complete | 8 | 1,917 | 11,896 | 6 | 0 |

Total: **17,410 battles**, **104,460 turns**, **9/9 completed**, **0 unresolved simulation stalls**. The full logs, assumptions and per-boss level/attempt summaries are in `audit/campaign-results.json`. Legally earned pre-boss checkpoints are included in `audit/checkpoints/`.

The browser checkpoint tests use those earned saves to jump to a particular boss. They verify UI behavior and settlement from that point, not the entire travel path in one session. The developer-only checkpoint loader used during testing is removed from the shipped game.

## Interactive desktop evidence

1. Created player AUDIT; named the trainer, woke in the bedroom, walked downstairs, spoke with Mom, exited home, entered Oak's lab, heard the story and selected Bulbasaur.
2. Finished the rival battle through defeat; Oak healed the partner, money stayed at ₽3,000, and the journal advanced to Brock.
3. Loaded the earned Brock checkpoint, entered the Gym, played through Geodude fainting, switched to Bulbasaur, used Leech Seed, defeated Onix, and received the Boulder Badge. The UI showed 1/8 badges, ₽3,947, and the next objective Challenge Misty.
4. Loaded the earned Champion checkpoint, entered the League, played through Blue's team, switched from fainted Lapras to Venusaur, won with Razor Leaf, settled the victory, and observed Kanto Champion, 8/8 badges, and Complete your Pokédex.
5. Reloaded and verified Kanto Champion persisted.
6. Visually inspected the classic battle background, HP panels, commands and sprites in the running game. This closes the earlier final-art-preview gap for that screen.

## Length and balance assessment

The game does not currently end quickly under the tested mixed-team strategy, but **its duration is dominated by grinding**. The final runs needed **1,687–2,092 wild training battles**. Some carry Pokémon reached very high levels while weaker teammates caught up. That is a pacing problem, not evidence of a finished long-form RPG.

A deliberately broad time model gives approximately **12.7–33.7 hours** for these particular strategies. It assumes 2.5–5 seconds per selected turn, 4–10 seconds of encounter overhead, 6–18 seconds per healing visit, plus 15–30 minutes for non-battle content. These are **not measured human completion times**, a speedrun lower bound, or a guarantee. Different teams, early fishing, catching high-stat Pokémon, and more efficient strategies can change them substantially.

Before calling the pacing ready, add meaningful trainer encounters and story quests, evaluate experience/reward pacing with several team-building styles, and prevent the experience from relying on thousands of repetitive encounters. This audit preserves the core Generation I progression rules rather than silently inventing a new level-cap policy.

## Remaining limits and priorities

- **P0 feature gap:** real card rewards and economy are unimplemented.
- **P1 content/balance:** only a compact 15-area structure and an opening story; most long-term duration is grind. Story continuation, trainer density and postgame content need expansion.
- **P1 verification:** no uninterrupted full browser campaign, real-phone playthrough, or exhaustive test of every UI/asset interaction. Intermediate gyms/League members have engine coverage rather than individually completed browser walkthroughs in this audit.
- **P2 mechanics fidelity:** some specialized move effects remain simplified, including trap locks, flinch, Toxic escalation, Bide/Rage, Disable duration, original badge/stat-experience details, exact OHKO interactions, and original glitches.
- Browser-local saves are editable. They cannot serve as the source of truth for valuable rewards.
- Save validation and migrations have tested cases, but fuzzing every possible corrupted local encounter snapshot remains future work.

## GitHub handoff

The handoff includes runnable static assets, a dependency-free Node local server, tests, a deterministic test player, audit evidence, CI workflow and setup instructions. The archive excludes Git history, host identity/configuration, credentials, raw downloaded assets and the temporary browser test loader. No new GitHub repository has been created or pushed; the user will supply/create that repository.
