# Playthrough corrections — 2.6.2

Fixed clipped/duplicated portraits, tiny mobile text, green battle-menu hover states, hidden final battle messages, instant map travel, and incomplete battle-save counters. Snapshot validation now rejects broken battle state and accepts older saves. Added a seeded battle stress check. See [playtest evidence](docs/PLAYTEST_2_6_2.md) for scope, regression tests and verification limits.

# Combined GitHub release — 2.6.1

- Reconciled main d141408 with claude/inspiring-tesla-5d4lcd 37dc4aa. Kept every nonconflicting change and resolved app/import, release and HTML conflicts by combining both branches.
- Includes original chiptune soundtrack, music preference/gesture unlock, battle and wild evolution fixes, defeat/recovery corrections, keyboard controls, landscape touch controls, ten-tier sandbox rewards, bank-adaptive odds and resumable guardian challenges.
- Retains smaller grass patches, removed fishing rails, selected-species encounter reveal, bounded transitions, and stable gold victory buttons.
- Hosted client and GitHub client now use identical files. Runtime host detection keeps the loopback-only Node reward authority available locally while the public static Site explains its development status. No live cards, token fee ingestion or public reward backend are configured.
- Validation: full combined automated suite and nine campaign simulations passed. Browser checks covered sound activation and remembered preference, saved adventure reload, guardian challenge resume after page reload, Enter activation of Continue, and touch movement in a 390px phone preview. No game-script errors were observed; no physical-phone or audio-listening claim is made. All 402 tracked files matched the Site source before hosting-only configuration.

# Victory button correction — 2.4.2

- Battle completion actions now use `battle-result` instead of the generic `primary` class. A scoped warm-gold/navy palette covers normal, hover, press and focus states; inherited green hover colors and decorative pointer arrows no longer apply. Keyboard focus remains visible.
- Versioned theme CSS and app entry prevent old phone styles persisting after deployment.

# Map correction — 2.4.1

- Removed the rail-shaped fishing platform shown beside the pond in the phone screenshot, including the legacy overview renderer. Fishing interaction remains available.
- Replaced blanket procedural grass with separated encounter meadows. Route 1 now has 60 grass tiles instead of hundreds; open shorelines and town/route paths remain safe.
- Explicit module version URLs refresh the changed world layout on phones. Save coordinates, encounters and captures remain compatible.

# Current update — tall grass encounters (v2.4.0)

- Native pixel grass clumps and foreground boot occlusion make encounter habitat obvious. No wild Pokémon are drawn on the map. Existing grass-only encounter rolls and fishing pools remain intact.
- A selected wild opponent rustles out as a silhouette, reveals its actual sprite/name/level, then enters the existing battle transition. Input remains locked through the entire sequence. Reduced motion uses opacity and a still reveal. Background-tab timeout prevents stuck controls.
- Removed floating decorative fence strips from town maps; the fishing platform remains beside the pond.
- Save format, capture rules, progression and reward settlement unchanged.
- Interactive QA: 390px phone preview, touch movement in Route 1 grass, silhouette → Oddish Lv.5 → same battle sprite; successful Poké Ball capture and return to map. Desktop grass inspected. Temporary QA fixtures excluded from publication.
- Validation: habitat reachability in all 15 areas, safe routes, reveal frames and duplicate encounter lock regression checks. See tests/wild-encounter.test.mjs.

# Pokémon · Kanto Journey

## Current milestone
A playable static browser RPG, built from scratch, now with a story-led opening and reference-inspired pixel art. Original maps, 151 original Pokémon, starter selection, exploration, catching/fishing, NPCs, trainer battles, eight sequential gyms, Elite Four and Champion, storage, shopping, party management, leveling/evolution, Pokédex, automatic local saves, battle recovery after reload, save export/import, keyboard and phone controls. No financial rewards or wallet integration are part of this milestone.

## Run and verify
- Static output: `dist/`. No installation or build dependencies required.
- `npm test`: 20 meaningful engine/data/map checks.
- `npm run build`: syntax checks for the three application modules.
- `npm run prepare-data`: downloads/caches the source CSVs and sprites, then regenerates packaged game data. This needs outbound network access.
- Hosting configuration: `.openai/hosting.json`.

## Architecture
- `dist/engine.mjs`: pure battle, stats, experience, evolution, catch checks, save validation.
- `dist/world.mjs`: 15 connected areas, map rendering, encounters, leader and League teams.
- `dist/app.mjs`: UI, game state, movement, progression, menus, persistence and story presentation.
- `dist/story.mjs`: trainer/rival names, new-game state, legacy migration, opening objectives, three room layouts and door destinations.
- `dist/renderer.mjs`: following camera, tile-based scenery, character-sheet walking animation, interior furniture, daylight and night grading/window lighting.
- `dist/rework.css`: immersive interface and classic battle panels.
- `src/fetch_art.py` and `src/build_pixel_art.py`: fetch and render source metatile art into reusable assets and draw the original fixed-grid battle landscape. Downloaded source assets stay untracked in `src/art/`.
- `dist/assets/data.json`: 151 species, 165 Generation I moves, original level learnsets and growth curves; historical type, power and PP changes applied.
- `dist/assets/sprites`: 151 front and 151 back FireRed/LeafGreen pixel sprites, bundled locally.
- Fonts are bundled locally. No external network request is needed to play.
- Save version 2, retaining key `kanto-journey-v1`. Version 1 saves migrate without changing parties, badges, money, storage, or world position. New games start in the bedroom with an empty party; such saves are accepted only before the starter stage. The prior adventure can be restored in Settings. Names are sanitized and bounded to 12 characters. Opening dialogue can safely replay if reloaded mid-conversation. Active battle snapshots preserve pending outcomes; only Continue settles capture, badge, or trainer rewards. Imported backups are validated; active encounter snapshots from imports are discarded.

## Design decisions
- New adventure in a Kanto-inspired region, not a recreation of the cartridge maps or scripted story.
- Keyboard: arrows/WASD, E/Space/Enter to interact, P party, B bag, M map, Escape menu.
- A party of six with storage. Healthy battle participants share experience; unused party members do not gain experience.
- New moves offer a choice when all four slots are occupied. Level evolutions happen automatically; store-bought Evolution Stones also cover trade evolutions in this single-player adventure.
- Gym victory unlocks the next road. The world menu allows travel to previously visited areas.
- All 151 are reachable through encounters, gifts and evolution. Original starters can be collected from Oak after earning a badge. Legendary encounters unlock after the Champion.
- Save data stays on the current browser/device. Export/import provides portable backups.

## Verification completed
20 automated checks pass: local assets, historical types/Special/move properties, Gen I chart interactions, damage/immunity/critical hits, PP/items, forced switching, poisoning/healing, capture checks, level/evolution thresholds, all species/all moves execute, map connectivity/services, gyms, malformed save rejection, Transform cleanup/HP preservation, participant EXP, roster obtainability, player-selected move replacement.

Interactive browser checks: selected Squirtle; moved around Pallet Town; fought a trainer with moves/PP and potion use; lost and recovered; fished, weakened and caught Seel; reloaded the unsettled capture and confirmed it resumed; added Seel to the party; healed both at a Center; deposited and withdrew Seel; searched for Pikachu in the Pokédex; crossed the north boundary into Route 1. Browser logs inspected: errors observed came from the browser extension, not application code. A complete eight-gym/League playthrough and phone viewport playthrough have not been performed.

## Material remaining limitations
The battle engine follows core Generation I rules but is not an exact hardware simulator. Specialized effects still need a fidelity pass: trapping locks, flinch, Toxic's escalating counter, Bide/Rage, original badge boosts/stat experience, exact OHKO and special-move interactions, and cartridge glitches. Some convenience mechanics intentionally differ (trade evolution via Evolution Stone, region travel menu, healing between League matches). Wild encounter locations and levels are original, and the EXP base-yield data is the current PokéAPI dataset rather than a verified Red-only yield table. Poké Ball capture follows the original random-threshold structure; additional ball tiers are not sold yet. Sounds are simple optional UI tones. Further region layout variation and story chapters beyond the opening remain future work. Home and laboratory interiors are implemented; Centers and shops still use service menus. Day/night is a manual visual setting rather than a real-time clock.

## Asset provenance
Data: https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv
Sprites: https://github.com/PokeAPI/sprites/tree/master/sprites/pokemon/versions/generation-iii/firered-leafgreen
Fonts: Google Fonts, DM Sans and Space Grotesk (bundled font files).
All world layouts and opening story are original. Room furniture and battle landscape were drawn in code; exterior building/foliage tiles and character sheets derive from the FireRed asset data exposed at https://github.com/pret/pokefirered. Reassembled building sprites align to the existing collision footprints. The uploaded reference image guided the pixel-art density, night lighting, and classic battle layout; it is not used as a runtime background. Pixel font: VT323 from Google Fonts. This is an unofficial fan project; Pokémon characters/assets belong to Nintendo / Creatures / GAME FREAK. Attribution is displayed in the app; it is not a claim of permission.

## Next work
1. Full player progression test through all eight gyms and the League; tune encounter/EXP pacing.
2. Add varied town layouts, interiors, quests, and richer original story beats.
3. Close the specialized move-fidelity gaps with specific regression tests.
4. Verify touch controls and menu layouts on a real narrow phone viewport.


## November 10 graphics and opening rework
- Start menu: Continue or Begin a new story, player and rival naming, Red/Leaf appearance.
- Playable opening: bedroom waking dialogue → stairs → Mom in living room → house exit → southwest Oak lab → original mystery hook → starter choice → rival practice battle → healed partner, supplies and Pokédex → northbound adventure. The practice battle has no defeat penalty.
- Journal follows every opening stage. TV and computer interactions add optional flavor. Mom heals the party on later visits.
- Close following camera shows 16×12 tiles instead of the full 30×22 area. Closer view shows 12×9 tiles. Fullscreen control is available.
- Detailed tile sprites for roofs, walls, foliage, grass, flower beds and water; optional night grading/window lights. Native walking sprites replace the original tiny drawn trainer.
- Classic battle HUD uses a pixel landscape with clouds, hills, grass platforms; square health panels; HP labels; blue battle text; command grid; pixel font; restrained attack animation and reduced-motion support.
- Validation: 29 checks pass (20 battle/data/map and 9 story/migration/room/camera checks). All five JavaScript modules pass syntax checks. Source scenery PNGs and native-size battle landscape were visually inspected during development.
- Interactive desktop playthrough completed: migrated the old two-Pokémon save, created LUCAS/BLUE, woke in bedroom, finished wake dialogue, reloaded and continued pre-starter save, walked downstairs, spoke with Mom, exited into town, reached Oak lab, heard four story pages, selected Bulbasaur, played the rival battle through defeat, finished Oak’s closing dialogue, and verified fully healed Bulbasaur, unchanged money, supplies and next-Gym journal.
- Verification limit: the cloud browser rejected the final refresh with a URL-policy error after the last exterior-tile/classic-battle visual pass. Those final art changes passed syntax checks and asset validation but were not re-inspected in the running browser. Full campaign and a narrow phone viewport remain untested.


## Audit build 2.0.1
Seven reproduced defects fixed; 36 automated checks, server smoke and syntax checks pass. Nine mixed-team engine campaigns complete with zero unresolved simulation stalls. Fresh opening, earned-checkpoint Brock and Champion UI flows, forced switching, badge/currency/quest settlement and Champion persistence were exercised in the desktop browser. Full audit and limitations: `audit/AUDIT_REPORT.md`. The game remains grind-heavy; Collector Crypt/card odds are absent. GitHub handoff adds README, local server and CI.

## Version 2.1 — Kanto-game repository handoff

- Formatted browser source; preserved module names and relative asset paths to avoid breaking saves/assets.
- Added local Node 24 + SQLite reward service, separate server-authoritative guardian ladder, three pack tiers, ten packs/day, shard exchange and persisted provider jobs.
- Added mock provider and official Invoiced Development adapter; production explicitly disabled. No token-fee integration or real asset issuance.
- Entry command is now `npm start` for game plus rewards; `npm run start:static` preserves the former static-only preview.
- Development guide: README.md; system map: docs/ARCHITECTURE.md; sample policy/integration boundary: docs/REWARDS.md.

## Version 2.2 — smoother interactions and phone controls

- Shared motion module for doors/routes/stairs, story start/continue, dialogue, menus, battle entrance/exit and turn feedback. Reduced-motion and cancellation/background safeguards included.
- Responsive phone stylesheet: larger touch targets, safe areas, scrolling menus/battles, landscape and fullscreen controls. Lost pointer capture and hidden tabs clear movement.
- See docs/MOTION_AND_PHONES.md for timings, behavior and QA scope. Existing saved adventures and reward policy are unchanged.

## Version 2.3 — collector interface and pixel detail
Dark collector display theme, native pixel-art town panorama, cached foliage/building/interior details, phone theme and closer camera. See docs/ART_AND_THEME.md. All four phone directions are covered by an interface regression check.

## Version 2.3.1 — phone jitter and invisible fades

Exact, time-based movement and idle positions; cached layouts; single-pointer D-pad. Frame-driven gentle opacity fades remain in reduced-motion mode. Scene content paints under cover; encounters and battle exits cover dialogs. Existing saves and gameplay rules remain compatible. See docs/MOTION_AND_PHONES.md for test scope and remaining device verification.

## Version 2.3.2 — battle fixes and keyboard menus

- Metronome or Mirror Move that becomes Transform no longer replaces the user's real moveset after battle.
- A transformed Pokémon earns EXP, learns moves and evolves as its own species rather than the copied one.
- The opponent no longer picks a disabled move (it used to turn into Struggle). Sending in a replacement after a faint no longer gives the opponent an extra poison/burn/Leech Seed tick. Escape odds rise once per attempt.
- Counter only answers damage taken this turn. Self-Destruct and Explosion faint the user even on a miss. Recover, Soft-Boiled and Rest fail at full HP.
- Status moves, Leech Seed and slower OHKO moves now say "But it failed!" instead of failing silently. Multi-hit moves report the hits that landed.
- Enter/Space activate focused menu buttons. Arrow keys and Space no longer scroll the page during scene transitions.
- The rewards API rejects JSON bodies that are not objects. Browser modules share one cache version, so `motion.mjs` loads once.
- 13 engine regression checks in `tests/engine-regressions.test.mjs`. All nine deterministic campaigns still complete with these fixes; pacing is unchanged (about 1,800–2,200 wild battles).

## Version 2.4.0 — reward ladder and bank-adaptive odds

- The guardian ladder grows from 3 to 10 tiers (Trail at 0 wins to Mythic at 180). Base card chance rises from 1% to 3.75%, shards from 50 to 110, guardian level from 20 to 75.
- A pack's card chance is its base chance × a bank multiplier (×0.5–×2, capped at 10%), calculated from the spendable bank balance and the last 7 days of fee deposits. It is locked when the pack is earned and stored with the pack.
- `npm run rewards:bank` shows bank health, or records idempotent `fee`/`topup` deposits. There is no web endpoint for deposits.
- The rewards panel shows rank, progress to the next tier and the next pack's odds. Older reward databases are upgraded in place; existing packs keep their odds.
- Config `sandbox-v2`. The adventure's grind-heavy pacing is intentionally unchanged.

## Version 2.5.0 — original soundtrack and post-battle fixes

- Original chiptune music written for this game (not taken from any existing soundtrack): home, town, route, forest/cave, wild battle and trainer/Gym/League battle loops, plus victory and healing jingles. Two pulse voices, a triangle bass and noise drums synthesized with Web Audio; no audio files.
- The Sound button turns music and effects on together and is remembered on this device. Audio starts on the first tap or key press, pauses in background tabs, and tracks crossfade as you move between areas and battles.
- Knocking out the opponent's last Pokémon is now a win even if your last Pokémon faints the same turn (poison, burn, recoil, Explosion). Previously it became a loss: you lost 10% of your money, got no badge, and were sent back.
- After a defeat with no Pokémon Center used yet, you return to the nearest town with a Center behind you, not Pallet Town. A double-knockout win carries your team to that Center with no penalty.

## Version 2.6.0 — play-through fixes

- Fishing and rare wild finds only produce evolved forms at believable levels: a level-8 Gyarados is now a Magikarp, an early Jolteon an Eevee, an Omastar below 40 an Omanyte. Previously every fishing spot, from Pallet Town on, could hook fully evolved Pokémon at levels 2–12. Hand-picked grass encounter tables are unchanged.
- Battle text names a transformed Pokémon by its own species ("Ditto fainted!", not the copied name).
- After becoming Champion, the journal title reads "Kanto Champion." instead of "The summit is waiting."
- Reopening the rewards panel after a reload shows the guardian challenge still running on the server. Previously, choosing a new partner silently resumed the old fight.
- Phones held sideways: the map fits the screen height and the D-pad and A/B buttons float over its sides, so you no longer scroll down to reach the controls. Continuing or starting a game scrolls the map into view.
- Touch screens wider than 760px (larger phones held sideways, tablets) now get the proper D-pad cross and the themed round A/B buttons, instead of a scrambled grid of blank squares.
