# Motion and phones

`dist/motion.mjs` owns short, presentation-only effects. `dist/phone.css` is loaded after the main styles and controls touch targets, narrow viewports, landscape, safe-area padding, scrolling dialogs and reduced motion. No user-agent sniffing or phone-only game build is needed.

## Covered transitions

- Doors, stairs and route boundaries fade through a dark veil before updating scene coordinates.
- New stories, continuing a save, battle entrances and battle exits use the same exclusive scene gate.
- Dialogue enters, changes lines and dismisses with brief fades. Menus ease in and out; battle menus use shorter content fades.
- Attacks and damage use small sprite movements; changing the active Pokémon fades the new sprite in.
- Time-of-day and camera zoom changes receive a brief visual cue. Location notices ease in.
- The local rewards UI animates opening/closing and challenge updates; existing pack tear/reveal effects remain cosmetic.

The gate clears held movement on both sides and ignores duplicate transition requests. State changes and saves occur under cover; animation completion never awards items, changes battle results or settles card rewards. Animation cancellation and a background-tab timeout release the gate. OS reduced-motion preferences skip JavaScript effects and suppress CSS animation.

## Phone behavior

- Portrait and landscape layouts, 44px-or-larger touch targets, a 48×46px portrait D-pad and 56px A/B controls.
- Touch movement stops on pointer release, cancellation, lost capture, page hiding or window blur.
- Inputs use 16px text to avoid automatic focus zoom in mobile browsers.
- Menus and battles scroll within the available dynamic viewport; the page has no fixed desktop minimum width.
- Phone fullscreen includes touch controls when the browser supports fullscreen. Opening a campaign menu exits fullscreen so the menu remains accessible. Normal browser play works without fullscreen support.

## Verification

Automated checks cover exclusive commits, failure cleanup, reduced motion, unsupported/cancelled animation and background fallback, alongside existing game/reward tests. Browser QA used real UI actions inside 320px and 390px portrait viewports: naming a trainer, dialogue, stairs, house exit, lab entry, starter selection, a completed practice battle and recovery. Layout measurements showed no horizontal overflow in those tested views. Landscape was inspected at 844×390. This is responsive browser QA, not testing on physical iOS/Android hardware.
