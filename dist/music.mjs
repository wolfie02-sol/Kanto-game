/** Original chiptune soundtrack (all melodies written for this game).
 * Handheld-style voices: two pulse waves, a triangle bass and noise drums,
 * scheduled ahead of time with Web Audio so playback stays steady.
 *
 * A track is: bpm, chords (one per bar), a melody (note:steps, 16 steps per
 * bar), and patterns that turn each bar's chord into arpeggios, bass and drums.
 */
export const TRACKS = {
  // Home, Pallet Town and the title screen: gentle.
  home: {
    bpm: 92,
    chords: "C Am F G C Am F G",
    melody: `E5:4 G5:4 C6:6 B5:2 | A5:4 G5:2 E5:2 C5:8 | F5:4 A5:4 C6:4 A5:4 | G5:6 F5:2 E5:4 D5:4 |
             E5:4 G5:4 E6:6 D6:2 | C6:4 B5:2 A5:2 E5:8 | F5:2 G5:2 A5:4 D6:4 C6:4 | B5:4 D6:4 C6:8`,
    arp: { tones: [0, 1, 2, 1], every: 2, octave: 4 },
    bass: { pattern: [0, 2], every: 8, len: 8, octave: 2 },
    drums: "",
  },
  // Towns and cities: bouncy.
  town: {
    bpm: 112,
    chords: "F Dm Bb C F Dm Bb C",
    melody: `C5:2 F5:2 A5:2 F5:2 C6:4 A5:4 | D5:2 F5:2 A5:4 G5:2 F5:2 D5:4 | D5:2 F5:2 Bb5:4 A5:2 G5:2 F5:4 | E5:4 G5:4 C5:4 r:4 |
             A5:2 C6:2 A5:2 F5:2 G5:2 A5:2 Bb5:4 | A5:4 F5:4 D5:4 F5:4 | Bb5:2 A5:2 G5:2 F5:2 D5:4 F5:4 | G5:4 E5:4 F5:8`,
    arp: { tones: [0, 2, 1, 2], every: 2, octave: 4 },
    bass: { pattern: [0, 2], every: 4, len: 3, octave: 2 },
    drums: "k...h...s...h...",
  },
  // Routes: driving, open road.
  route: {
    bpm: 138,
    chords: "G Em C D G Em C D",
    melody: `D5:2 G5:2 B5:4 A5:2 G5:2 D5:4 | E5:2 G5:2 B5:4 D6:4 B5:4 | C6:4 B5:2 A5:2 G5:4 E5:4 | F#5:4 A5:4 D6:6 C6:2 |
             B5:2 D6:2 B5:2 G5:2 A5:2 B5:2 G5:4 | E6:4 D6:2 B5:2 G5:4 B5:4 | A5:2 B5:2 C6:4 E6:4 D6:4 | D6:4 F#5:4 G5:8`,
    arp: { tones: [0, 1, 2, 1], every: 2, octave: 4 },
    bass: { pattern: [0], every: 2, len: 2, octave: 2 },
    drums: "k.h.s.h.k.hks.h.",
  },
  // Forests and caves: sparse and curious.
  forest: {
    bpm: 96,
    chords: "Dm Bb Gm A Dm Bb Gm A",
    melody: `A5:6 F5:2 D5:8 | F5:6 D5:2 Bb4:8 | G5:4 A5:4 Bb5:4 D6:4 | C#6:8 A5:4 E5:4 |
             D6:6 C6:2 A5:8 | Bb5:4 A5:4 F5:8 | G5:2 A5:2 Bb5:4 A5:4 G5:4 | E5:4 G5:4 A5:8`,
    arp: { tones: [0, 1, 2, 1], every: 1, octave: 4, volume: 0.6 },
    bass: { pattern: [0], every: 8, len: 7, octave: 2 },
    drums: "k.......k.......",
  },
  // Wild encounters: fast and urgent.
  battle: {
    bpm: 168,
    chords: "Am F G E Am F G E",
    melody: `A5:2 A5:2 C6:2 A5:2 E6:4 D6:2 C6:2 | C6:2 A5:2 F5:4 A5:2 C6:2 F6:4 | D6:2 B5:2 G5:4 B5:2 D6:2 G6:4 | E6:4 D6:2 B5:2 G#5:8 |
             E6:2 D6:2 C6:2 B5:2 A5:4 C6:4 | F6:4 E6:2 C6:2 A5:8 | G5:2 A5:2 B5:2 D6:2 G6:4 F6:4 | E6:4 B5:4 G#5:4 E5:4`,
    arp: { tones: [0, 1, 2, 1], every: 1, octave: 4 },
    bass: { pattern: [0, 7], every: 2, len: 2, octave: 2, octaves: true },
    drums: "k.hhs.hhk.hhs.hk",
  },
  // Trainers, Gym Leaders, the League and the rival.
  boss: {
    bpm: 176,
    chords: "Em C D B Em C D B",
    melody: `E5:2 G5:2 B5:2 E6:2 D6:2 B5:2 G5:4 | C6:2 E6:2 G6:4 E6:2 C6:2 G5:4 | D6:2 F#6:2 A6:4 F#6:2 D6:2 A5:4 | B5:4 D#6:4 F#6:8 |
             G6:2 F#6:2 E6:2 B5:2 E6:4 G6:4 | E6:4 C6:4 G5:4 E5:4 | F#5:2 A5:2 D6:2 F#6:2 A6:4 F#6:4 | D#6:4 B5:4 F#5:8`,
    arp: { tones: [0, 2, 1, 2], every: 1, octave: 4 },
    bass: { pattern: [0, 7], every: 2, len: 2, octave: 2, octaves: true },
    drums: "kkhhs.hkkkhhs.hs",
  },
  // One-shot jingles.
  victory: {
    bpm: 132,
    loop: false,
    chords: "C G C",
    melody: `G5:2 C6:2 E6:2 G6:6 E6:2 G6:2 | F6:2 E6:2 D6:2 B5:2 G5:4 D6:4 | C6:12 r:4`,
    arp: { tones: [0, 1, 2, 1], every: 2, octave: 4 },
    bass: { pattern: [0], every: 4, len: 3, octave: 2 },
    drums: "k...s...k...s...",
  },
  heal: {
    bpm: 120,
    loop: false,
    chords: "C F C",
    melody: `C6:2 E6:2 G6:2 E6:2 C7:8 | A6:2 F6:2 C6:2 F6:2 A6:8 | G6:4 E6:4 C7:8`,
    arp: { tones: [0, 1, 2, 1], every: 2, octave: 5, volume: 0.5 },
    bass: { pattern: [0], every: 8, len: 8, octave: 3 },
    drums: "",
  },
};

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw Error(`Bad note ${name}`);
  return (
    12 * (Number(m[3]) + 1) +
    NOTE[m[1]] +
    (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0)
  );
}
export const frequency = (n) => 440 * 2 ** ((n - 69) / 12);
// Chord name → semitone offsets from C of root, third, fifth.
export function chordTones(name) {
  const m = /^([A-G])([#b]?)(m?)$/.exec(name);
  if (!m) throw Error(`Bad chord ${name}`);
  const root = NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  return [root, root + (m[3] ? 3 : 4), root + 7];
}
export const STEPS_PER_BAR = 16;

/** Turn a track description into per-step events. Pure, so it can be tested. */
export function compile(track) {
  const chords = track.chords.split(/\s+/).filter(Boolean),
    length = chords.length * STEPS_PER_BAR,
    steps = Array.from({ length }, () => []);
  // Melody (lead pulse voice).
  const bars = track.melody.split("|").map((b) => b.trim());
  if (bars.length !== chords.length)
    throw Error("Melody needs one bar per chord");
  bars.forEach((bar, i) => {
    let at = i * STEPS_PER_BAR;
    for (const token of bar.split(/\s+/)) {
      const [note, d] = token.split(":"),
        dur = Number(d);
      if (!Number.isInteger(dur) || dur < 1)
        throw Error(`Bad duration ${token}`);
      if (note !== "r")
        steps[at].push({ voice: "lead", note: midi(note), dur });
      at += dur;
    }
    if (at !== (i + 1) * STEPS_PER_BAR)
      throw Error(`Bar ${i + 1} has ${at - i * STEPS_PER_BAR} steps`);
  });
  chords.forEach((name, i) => {
    const tones = chordTones(name),
      start = i * STEPS_PER_BAR;
    // Arpeggio (second pulse voice).
    const a = track.arp;
    for (let s = 0, k = 0; s < STEPS_PER_BAR; s += a.every, k++) {
      const t = tones[a.tones[k % a.tones.length]];
      steps[start + s].push({
        voice: "harmony",
        note: 12 * (a.octave + 1) + t,
        dur: a.every,
        volume: a.volume ?? 1,
      });
    }
    // Bass (triangle voice). Pattern entries: 0 = root, 2 = fifth, 7 = root an octave up.
    const b = track.bass;
    for (let s = 0, k = 0; s < STEPS_PER_BAR; s += b.every, k++) {
      const p = b.pattern[k % b.pattern.length];
      if (p === null || p === undefined) continue;
      const offset = p === 2 ? tones[2] - tones[0] : p === 7 ? 12 : 0;
      steps[start + s].push({
        voice: "bass",
        note: 12 * (b.octave + 1) + tones[0] + offset,
        dur: Math.min(b.len, STEPS_PER_BAR - s),
      });
    }
    // Drums (noise voice): k = kick, s = snare, h = hat, . = rest.
    if (track.drums)
      [...track.drums].forEach((c, s) => {
        if ("ksh".includes(c)) steps[start + s].push({ voice: "drum", hit: c });
      });
  });
  return {
    steps,
    length,
    stepSeconds: 60 / track.bpm / 4,
    loop: track.loop !== false,
  };
}

const VOLUME = { lead: 0.06, harmony: 0.028, bass: 0.11, drum: 0.05 };

export function createMusic() {
  let ctx = null,
    master,
    waves,
    noise,
    enabled = false,
    current = null, // name of the requested background track
    playing = null, // { song, bus, step, next }
    jingle = null,
    timer = null;
  const compiled = {};
  const song = (name) => (compiled[name] ??= compile(TRACKS[name]));

  function setup() {
    if (ctx) return;
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) return;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    // Pulse waves with handheld-style duty cycles.
    const pulse = (duty) => {
      const n = 48,
        real = new Float32Array(n),
        imag = new Float32Array(n);
      for (let i = 1; i < n; i++)
        real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
      return ctx.createPeriodicWave(real, imag);
    };
    waves = { lead: pulse(0.25), harmony: pulse(0.125) };
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    // Browsers only start audio after a user gesture.
    const unlock = () => {
      if (enabled && ctx.state === "suspended") ctx.resume().catch(() => {});
    };
    for (const type of ["pointerdown", "keydown", "touchend"])
      globalThis.addEventListener?.(type, unlock, { passive: true });
    globalThis.document?.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {});
      else if (enabled) ctx.resume().catch(() => {});
    });
  }

  function voice(event, time, seconds, bus) {
    if (event.voice === "drum") return drum(event.hit, time, bus);
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      peak = VOLUME[event.voice] * (event.volume ?? 1),
      length = Math.max(0.03, event.dur * seconds - 0.012);
    if (event.voice === "bass") osc.type = "triangle";
    else osc.setPeriodicWave(waves[event.voice]);
    osc.frequency.setValueAtTime(frequency(event.note), time);
    gain.gain.setValueAtTime(peak, time);
    gain.gain.linearRampToValueAtTime(peak * 0.6, time + length * 0.7);
    gain.gain.linearRampToValueAtTime(0.0001, time + length);
    osc.connect(gain).connect(bus);
    osc.start(time);
    osc.stop(time + length + 0.02);
  }

  function drum(hit, time, bus) {
    const gain = ctx.createGain(),
      peak = VOLUME.drum * (hit === "h" ? 0.5 : 1),
      length = hit === "k" ? 0.12 : hit === "s" ? 0.14 : 0.04;
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    if (hit === "k") {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + length);
      gain.gain.setValueAtTime(peak * 3, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
      osc.connect(gain).connect(bus);
      osc.start(time);
      osc.stop(time + length + 0.02);
      return;
    }
    const src = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter();
    src.buffer = noise;
    filter.type = hit === "s" ? "bandpass" : "highpass";
    filter.frequency.value = hit === "s" ? 1800 : 7000;
    src.connect(filter).connect(gain).connect(bus);
    src.start(time, Math.random() * 0.5);
    src.stop(time + length + 0.02);
  }

  function startSong(name) {
    const bus = ctx.createGain();
    bus.connect(master);
    return {
      name,
      song: song(name),
      bus,
      step: 0,
      next: ctx.currentTime + 0.06,
    };
  }
  function fadeOut(p) {
    if (!p) return;
    const t = ctx.currentTime;
    p.bus.gain.setValueAtTime(p.bus.gain.value, t);
    p.bus.gain.linearRampToValueAtTime(0, t + 0.25);
    setTimeout(() => p.bus.disconnect(), 400);
  }
  // Schedule notes slightly ahead of the audio clock.
  function advance(p) {
    if (!p || p.done) return;
    const horizon = ctx.currentTime + 0.15;
    while (p.next < horizon) {
      for (const e of p.song.steps[p.step])
        voice(e, p.next, p.song.stepSeconds, p.bus);
      p.next += p.song.stepSeconds;
      if (++p.step >= p.song.length) {
        if (!p.song.loop) {
          p.done = true;
          p.endsAt = p.next;
          return;
        }
        p.step = 0;
      }
    }
  }
  function tick() {
    if (!ctx || !enabled) return;
    if (ctx.currentTime > 0 && playing?.next < ctx.currentTime - 1)
      playing.next = ctx.currentTime + 0.05; // recover after the tab was asleep
    advance(playing);
    if (jingle) {
      advance(jingle);
      if (jingle.done && ctx.currentTime > jingle.endsAt + 0.2) {
        fadeOut(jingle);
        jingle = null;
        if (playing) {
          playing.bus.gain.cancelScheduledValues(ctx.currentTime);
          playing.bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6);
        }
      }
    }
  }

  return {
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = !!on;
      if (enabled) {
        setup();
        if (!ctx) return;
        ctx.resume().catch(() => {});
        if (current && !playing) playing = startSong(current);
        timer ??= setInterval(tick, 25);
      } else if (ctx) {
        fadeOut(playing);
        fadeOut(jingle);
        playing = jingle = null;
        clearInterval(timer);
        timer = null;
      }
    },
    /** Request the background track; switching is a no-op if it is already playing. */
    play(name) {
      if (name !== null && !TRACKS[name]) throw Error(`Unknown track ${name}`);
      if (name === current) return;
      current = name;
      if (!enabled || !ctx) return;
      fadeOut(playing);
      playing = name ? startSong(name) : null;
    },
    /** A short tune over the current track, which dips and then returns. */
    jingle(name) {
      if (!enabled || !ctx || !TRACKS[name]) return;
      fadeOut(jingle);
      jingle = startSong(name);
      if (playing) {
        playing.bus.gain.setValueAtTime(
          playing.bus.gain.value,
          ctx.currentTime,
        );
        playing.bus.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.15);
      }
    },
    get track() {
      return current;
    },
  };
}
