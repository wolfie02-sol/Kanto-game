# Motion and phones

`dist/motion.mjs` owns short, presentation-only effects. `dist/phone.css` is loaded after the main styles and controls touch targets, narrow viewports, landscape, safe-area padding, scrolling dialogs and reduced motion. No user-agent sniffing or phone-only game build is needed.

## Covered transitions

- Doors, stairs and route boundaries fade through a dark veil before updating scene coordinates.
- New stories, continuing a save, battle entrances and battle exits use the same exclusive scene gate.
- Dialogue enters, changes lines and dismisses with brief fades. Menus ease in and out; battle menus use shorter content fades.
- Attacks and damage use small sprite movements; changing the active Pokémon fades the new sprite in.
- Time-of-day and camera zoom changes receive a brief visual cue. Location notices ease in.
- The local rewards UI animates opening/closing and challenge updates; existing pack tear/reveal effects remain cosmetic.

The gate clears held movement on both sides and ignores duplicate transition requests. State changes and saves occur under cover; animation completion never awards items, changes battle results or settles card rewards. Animation cancellation and a background-tab timeout release the gate. OS reduced-motion preferences suppress decorative movement and CSS animation. Essential scene changes retain a gentle opacity fade.

## Phone behavior

- Portrait and landscape layouts, 44px-or-larger touch targets, a 48×46px portrait D-pad and 56px A/B controls.
- Touch movement stops on pointer release, cancellation, lost capture, page hiding or window blur.
- Inputs use 16px text to avoid automatic focus zoom in mobile browsers.
- Menus and battles scroll within the available dynamic viewport; the page has no fixed desktop minimum width.
- Phone fullscreen includes touch controls when the browser supports fullscreen. Opening a campaign menu exits fullscreen so the menu remains accessible. Normal browser play works without fullscreen support.

## Verification

Automated checks cover exclusive commits, failure cleanup, reduced motion, unsupported/cancelled animation and background fallback, alongside existing game/reward tests. Browser QA used real UI actions inside 320px and 390px portrait viewports: naming a trainer, dialogue, stairs, house exit, lab entry, starter selection, a completed practice battle and recovery. Layout measurements showed no horizontal overflow in those tested views. Landscape was inspected at 844×390. This is responsive browser QA, not testing on physical iOS/Android hardware.

## Phone stability correction (2.3.1)

`dist/locomotion.mjs` replaces frame-dependent chasing with exact 140ms steps and a gait tied to those steps. Idle coordinates stop exactly; scene changes snap instead of sliding from the old room. The renderer caches map layouts and follows browser refresh directly. Only one primary touch can drive the D-pad.

Essential scene, dialogue and menu fades now drive opacity directly with requestAnimationFrame. They work without Web Animations support and retain gentle opacity feedback when reduced motion is enabled. Decorative motion remains suppressed. New content is painted while the veil is opaque; battle and return fades cover the full viewport above battle dialogs. Fades have a bounded fallback when the page is backgrounded.

Regression checks cover 30/60/120Hz equivalence, exact idle/arrival, teleport snapping, gait timing, covered painting, and intermediate opacity. Browser QA confirmed touch movement and a door fade. Physical iOS/Android verification remains outstanding; the saved-battle browser check encountered a test-tool timeout.
