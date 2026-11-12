# Playthrough fixes — 2.6.2

| Finding                                                                                           | Correction                                                                                        | Verification                                                                |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Portrait widths did not match the nine-frame sheet, exposing a slice of the next character frame. | Exact single-frame dimensions and centered alignment: 32×64 desktop, 24×48 phone.                 | Phone story flow and computed dimensions.                                   |
| Mobile dialogue and battle text shrank to 12px pixel type.                                        | Dialogue/logs 18px, actions 20px, larger Continue target.                                         | Phone visual and computed-style checks.                                     |
| Legacy hover rules flashed green/transparent after touch.                                         | Scoped, stable cream/blue battle controls; retain gold results and keyboard focus.                | Cascade inspection and menu interactions.                                   |
| Long logs hid final messages because rendering reset scroll to the top.                           | Scroll to the latest message.                                                                     | Six-line defeat: 192px content in a 92px box, scrolled 100px to the result. |
| Fast travel jumped immediately while dismissing its modal.                                        | Shared scene gate, covered repaint and duplicate-input lock.                                      | Browser observed route transition.                                          |
| Failed escapes reset on reload; malformed snapshots could break startup.                          | Complete battle snapshot/restore, old-save compatibility and validated indices/opponents/results. | Four regression checks and a real first-battle reload.                      |

## Interactive coverage

A fresh phone-sized playthrough covered naming and appearance, opening dialogue, bedroom stairs, Mom, leaving home, Pallet Town, Oak's lab, starter selection, rival battle, mid-battle reload, tutorial defeat and healing. A normal wild encounter covered attack, failed capture, critical/super-effective damage and defeat recovery.

Explicit local checkpoints covered a seventh capture going to storage, refusal to withdraw into a full party, and Pokémon Center healing. The Champion fight was played through all six opponents: freezing, experience, leveling, depleted Ice Beam PP, changing to Body Slam, victory settlement and the Kanto Champion journal state worked. Desktop keyboard checks covered Continue, Gym interaction and battle entry at Brock's checkpoint.

This was an opening playthrough plus later checkpoints, not a manual journey through every route/Gym. No physical-phone or audio-listening verification is claimed. Rewards remain a local sandbox; live card issuance is not active on the public Site.

## Repeatable checks

- `npm test` and `npm run build`.
- `npm run audit:campaign`: nine seeded complete campaigns.
- `npm run audit:stress`: 2,000 seeded randomized battles, up to 120 turns each; HP/PP bounds. Seed 262.
- `tests/battle-session.test.mjs`: failed escapes, old snapshots, pending outcomes and malformed state.

Temporary browser checkpoints are ignored and excluded from deployment. Hosted files are compared against GitHub before packaging.
