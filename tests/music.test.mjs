import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TRACKS,
  compile,
  midi,
  chordTones,
  createMusic,
  STEPS_PER_BAR,
} from "../dist/music.mjs";

test("every track compiles with full bars and playable notes", () => {
  for (const [name, track] of Object.entries(TRACKS)) {
    const song = compile(track);
    assert.equal(song.length % STEPS_PER_BAR, 0, name);
    for (const e of song.steps.flat()) {
      if (e.voice === "drum") assert.match(e.hit, /^[ksh]$/);
      else {
        assert.ok(e.note >= 33 && e.note <= 100, `${name} note ${e.note}`);
        assert.ok(e.dur >= 1, name);
      }
    }
  }
});

test("background tracks loop and jingles play once", () => {
  for (const name of ["home", "town", "route", "forest", "battle", "boss"])
    assert.equal(compile(TRACKS[name]).loop, true, name);
  for (const name of ["victory", "heal"])
    assert.equal(compile(TRACKS[name]).loop, false, name);
  assert.ok(
    compile(TRACKS.battle).stepSeconds < compile(TRACKS.home).stepSeconds,
  );
});

test("note and chord parsing", () => {
  assert.equal(midi("A4"), 69);
  assert.equal(midi("C#5"), 73);
  assert.equal(midi("Bb4"), 70);
  assert.deepEqual(chordTones("Am"), [9, 12, 16]);
  assert.deepEqual(chordTones("F#"), [6, 10, 13]);
  assert.throws(
    () => compile({ ...TRACKS.home, melody: "C5:4 | " + TRACKS.home.melody }),
    /one bar per chord/,
  );
  assert.throws(
    () => compile({ ...TRACKS.home, chords: "C", melody: "C5:15" }),
    /15 steps/,
  );
});

test("the player is silent and safe without Web Audio", () => {
  const music = createMusic();
  music.play("town");
  music.setEnabled(true);
  music.jingle("heal");
  music.play("battle");
  music.setEnabled(false);
  assert.equal(music.track, "battle");
  assert.throws(() => music.play("missing"), /Unknown track/);
});
