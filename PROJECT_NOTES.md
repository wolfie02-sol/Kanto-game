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
