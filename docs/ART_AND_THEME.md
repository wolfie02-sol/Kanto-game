# Pixel art and collector interface

The visual system is inspired by Collector Crypt's dark display cases and blue/orange edges, combined with a classic Pokémon console, warm parchment dialogue, type-colored party rows, badge gems, and a pixel-art town panorama. This is an independent fan interface, not an official Collector Crypt product.

## Files to edit

- `dist/collector-theme.css`: the final website theme, component styling and phone overrides. It loads last, after `phone.css`, and reuses the existing game controls.
- `dist/pixel-detail.mjs`: original native-grid details for vegetation, ground borders, stones, masonry, chimneys, flower boxes, furniture, stitched fabrics, wood grain, wallpaper, framed art and lab equipment.
- `dist/renderer.mjs`: layer ordering, existing source sprites, map cache and `drawTitlePanorama`. Detail functions draw into cached map canvases; gameplay tiles and collision stay separate.
- `dist/index.html`: collector feature panel, numbered navigation and collector journey footer.
- `dist/app.mjs`: title-screen composition, party type accents and collector navigation. The local full build opens sandbox rewards. The static hosted build explains where that development system is available.

Keep every pixel-detail operation on the native grid. Static details belong in the map cache, not per-frame loops. Decorative pots, bags and foliage do not create new collision tiles or change paths. Existing third-party sprites and their source records are retained; the new ornament drawing code is original.

## Phone behavior

The collector theme has its own phone overrides while retaining the shared safe-area, touch-cancellation and motion support. The phone camera starts at the closer 288×216 view; desktop starts at 384×288. The zoom button still switches both views. Navigation, collector panels, party cards, title/setup menus and rewards remain responsive.

## Verification

Existing battle, story, rewards, motion and HTTP checks are retained. Browser QA covers the desktop title and adventure page, collector panel opening, narrow phone layout, menu sizing and touch movement. No physical iOS/Android device was available. The rendering pass does not change battle rules, saves or card fulfillment.
