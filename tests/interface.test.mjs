import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
test("phone retains all four labelled directions plus interaction and menu controls", () => {
  const buttons = [...html.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
  for (const direction of ["up", "left", "down", "right"]) {
    const matches = buttons.filter((b) =>
      b.includes(`data-dir="${direction}"`),
    );
    assert.equal(
      matches.length,
      1,
      `Exactly one ${direction} control must remain`,
    );
    assert.ok(matches[0].includes(`aria-label="Move ${direction}"`));
  }
  assert.ok(buttons.some((b) => b.includes('id="touchA"')));
  assert.ok(buttons.some((b) => b.includes('id="touchB"')));
});
test("collector entry and local theme assets remain available", () => {
  assert.match(html, /id="collectorInfoBtn"/);
  assert.match(html, /data-view="collect"/);
  assert.match(html, /href="collector-theme.css"/);
  for (const file of ["collector-theme.css", "pixel-detail.mjs"])
    assert.ok(
      readFileSync(new URL("../dist/" + file, import.meta.url)).length > 0,
    );
});
