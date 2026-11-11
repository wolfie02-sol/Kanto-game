export const ROOMS = ["bedroom", "living", "lab"];
export const STAGES = [
  "wake",
  "downstairs",
  "mom",
  "lab",
  "starter",
  "rival",
  "ready",
];
export const sanitizeName = (value, fallback = "RED") =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} .’'-]/gu, "")
    .trim()
    .slice(0, 12) || fallback;
export function newAdventure(name = "RED", appearance = "red", rival = "BLUE") {
  return {
    version: 2,
    timeOfDay: "morning",
    trainerName: sanitizeName(name),
    appearance: appearance === "leaf" ? "leaf" : "red",
    rivalName: sanitizeName(rival, "BLUE"),
    scene: "bedroom",
    storyStage: "wake",
    zone: 0,
    x: 5,
    y: 6,
    dir: "down",
    party: [],
    box: [],
    bag: { ball: 0, potion: 0, stone: 0 },
    money: 3000,
    badges: [],
    seen: [],
    caught: [],
    defeated: [],
    visited: [0],
    league: 0,
    champion: false,
    playtime: 0,
  };
}
export function migrateAdventure(old) {
  let s = structuredClone(old);
  if (s.version === 1) {
    s.version = 2;
    s.trainerName = "RED";
    s.rivalName = "BLUE";
    s.appearance = "red";
    s.scene = "outdoor";
    s.storyStage = "ready";
  }
  s.visited ??= [s.zone];
  s.timeOfDay ??= "morning";
  return s;
}
export function storyObjective(s) {
  let n = s?.trainerName || "Trainer";
  let objectives = {
    wake: [
      "A morning like no other.",
      "Your story begins in a small room in Pallet Town.",
      "Wake up",
      "Your bedroom",
    ],
    downstairs: [
      "The world can wait a moment.",
      "A familiar voice calls up from downstairs. Mom has something for you.",
      "Head downstairs",
      "Stairs · southeast corner",
    ],
    mom: [
      "One last thing before you go.",
      "Find Mom downstairs. Every adventure starts with someone cheering you on.",
      "Talk to Mom",
      "Living room",
    ],
    lab: [
      `A first step, ${n}.`,
      "Professor Oak is waiting at his laboratory in the southwest of Pallet Town.",
      "Visit Professor Oak",
      "Oak’s Lab · Pallet Town",
    ],
    starter: [
      "A friendship starts here.",
      "Three Poké Balls. Three possibilities. Choose the partner who feels right.",
      "Choose your first Pokémon",
      "Poké Balls · Oak’s Lab",
    ],
    rival: [
      "Your very first battle.",
      "Your rival wants to see what your new partner can do. Oak is here to help.",
      "Battle your rival",
      "Oak’s Lab",
    ],
  };
  return objectives[s?.storyStage] || null;
}
export function roomWorld(scene) {
  let tiles = Array.from({ length: 12 }, (_, y) =>
    Array.from({ length: 14 }, (_, x) =>
      x === 0 || x === 13 || y < 2 || y === 11 ? 1 : 0,
    ),
  );
  let objects = [],
    decor = [];
  const block = (kind, x, y, w = 1, h = 1) => {
    decor.push({ kind, x, y, w, h });
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) tiles[yy][xx] = 7;
  };
  if (scene === "bedroom") {
    block("bed", 2, 3, 2, 3);
    block("shelf", 1, 2, 3, 1);
    block("desk", 7, 3, 3, 1);
    block("plant", 11, 2);
    block("tv", 11, 5);
    block("chair", 8, 4);
    decor.push(
      { kind: "rug", x: 5, y: 6, w: 5, h: 3 },
      { kind: "poster", x: 5, y: 1, w: 1, h: 1 },
      { kind: "window", x: 8, y: 1, w: 2, h: 1 },
    );
    objects = [
      { x: 12, y: 9, kind: "stairs-down" },
      { x: 7, y: 4, kind: "computer" },
      { x: 11, y: 6, kind: "tv" },
      { x: 3, y: 6, kind: "bed" },
    ];
  } else if (scene === "living") {
    block("kitchen", 1, 2, 5, 1);
    block("plant", 1, 9);
    block("plant", 12, 9);
    block("sofa", 8, 5, 3, 1);
    block("table", 8, 7, 2, 1);
    block("tv", 10, 3);
    block("shelf", 1, 5, 2, 1);
    decor.push(
      { kind: "rug", x: 7, y: 6, w: 5, h: 3 },
      { kind: "window", x: 7, y: 1, w: 2, h: 1 },
    );
    objects = [
      { x: 12, y: 3, kind: "stairs-up" },
      { x: 5, y: 6, kind: "mom", character: "mom" },
      { x: 7, y: 10, kind: "home-exit" },
      { x: 10, y: 4, kind: "tv" },
    ];
  } else {
    block("shelf", 1, 2, 3, 1);
    block("shelf", 10, 2, 3, 1);
    block("machine", 1, 5, 2, 2);
    block("machine", 11, 5, 2, 2);
    block("lab-table", 4, 5, 6, 1);
    decor.push(
      { kind: "rug", x: 5, y: 8, w: 4, h: 2 },
      { kind: "window", x: 6, y: 1, w: 2, h: 1 },
    );
    objects = [
      { x: 7, y: 4, kind: "oak", character: "oak" },
      { x: 5, y: 6, kind: "starter-ball", starter: 1 },
      { x: 7, y: 6, kind: "starter-ball", starter: 4 },
      { x: 9, y: 6, kind: "starter-ball", starter: 7 },
      { x: 10, y: 8, kind: "rival", character: "blue" },
      { x: 7, y: 10, kind: "lab-exit" },
    ];
  }
  return { tiles, objects, decor, buildings: [] };
}
export const sceneName = (s) =>
  s?.scene === "bedroom"
    ? `${s.trainerName || "Your"}’s room`
    : s?.scene === "living"
      ? "Home · Living room"
      : s?.scene === "lab"
        ? "Professor Oak’s Lab"
        : null;
export const roomTransition = (kind) =>
  ({
    "stairs-down": { scene: "living", x: 12, y: 4, dir: "down" },
    "stairs-up": { scene: "bedroom", x: 12, y: 8, dir: "up" },
    "home-exit": { scene: "outdoor", zone: 0, x: 24, y: 9, dir: "down" },
    "lab-exit": { scene: "outdoor", zone: 0, x: 6, y: 18, dir: "down" },
  })[kind];
