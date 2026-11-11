import { createWalker } from "./locomotion.mjs?v=2.3.1";
import {
  detailGround,
  buildingShadow,
  detailBuilding,
  furnitureShadow,
  detailFurniture,
  detailRoom,
  animateScenery,
} from "./pixel-detail.mjs";
import { world, ZONES } from "./world.mjs";
import { roomWorld } from "./story.mjs";
export const TILE = 24,
  VIEW_W = 384,
  VIEW_H = 288;
const images = {},
  cache = new Map();
const layouts = new Map();
function layoutFor(key) {
  if (!layouts.has(key))
    layouts.set(
      key,
      key.startsWith("room:")
        ? roomWorld(key.slice(5))
        : world(Number(key.slice(5))),
    );
  return layouts.get(key);
}
const walker = createWalker();
export async function loadCharacters() {
  let sources = Object.fromEntries(
    ["red", "leaf", "oak", "mom", "blue", "nurse"].map((key) => [
      key,
      `assets/characters/${key}.png`,
    ]),
  );
  for (let key of [
    "tree",
    "house-red",
    "house-blue",
    "house-gold",
    "laboratory",
    "grass",
    "ground",
    "water",
    "flowers",
    "fence",
  ])
    sources[key] = `assets/scenery/${key}.png`;
  await Promise.all(
    Object.entries(sources).map(
      ([key, url]) =>
        new Promise((resolve) => {
          let im = new Image();
          im.onload = () => {
            images[key] = im;
            resolve();
          };
          im.onerror = resolve;
          im.src = url;
        }),
    ),
  );
}
const box = (c, x, y, w, h, color) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};
const noise = (x, y, n = 0) =>
  Math.abs(Math.sin(x * 127.1 + y * 311.7 + n * 74.7) * 43758.5453) % 1;
function ellipse(c, x, y, w, h, color) {
  c.fillStyle = color;
  for (let r = 0; r < h; r++) {
    let s = Math.sqrt(Math.max(0, 1 - ((r - h / 2) / (h / 2)) ** 2));
    let a = Math.floor((w - w * s) / 2);
    c.fillRect(Math.round(x + a), Math.round(y + r), Math.ceil(w * s), 1);
  }
}
function tree(c, x, y) {
  if (images.tree) {
    ellipse(c, x - 3, y + 17, 34, 12, "#274d3e40");
    c.drawImage(images.tree, x - 6, y - 12, 36, 36);
    return;
  }
  ellipse(c, x - 4, y + 13, 33, 12, "#32634b55");
  box(c, x + 9, y + 9, 7, 16, "#765b3f");
  box(c, x + 11, y + 8, 3, 17, "#a3824d");
  ellipse(c, x - 3, y - 8, 31, 30, "#286047");
  ellipse(c, x - 2, y - 8, 28, 25, "#37805a");
  ellipse(c, x + 1, y - 8, 22, 19, "#4e9b67");
  ellipse(c, x + 4, y - 9, 15, 11, "#75b777");
  for (let i = 0; i < 8; i++) {
    let a = noise(i, x + y);
    box(
      c,
      x + Math.floor(a * 21),
      y + Math.floor(noise(i, 7 + x) * 13),
      3,
      2,
      i % 2 ? "#79b774" : "#2b7050",
    );
  }
  box(c, x + 1, y + 10, 4, 3, "#23593f");
  box(c, x + 19, y + 9, 5, 3, "#23593f");
}
function plant(c, x, y) {
  box(c, x + 6, y + 14, 12, 8, "#a36449");
  box(c, x + 5, y + 12, 14, 4, "#d09661");
  box(c, x + 8, y + 20, 8, 2, "#744e3d");
  box(c, x + 11, y + 3, 2, 13, "#366a4a");
  ellipse(c, x + 2, y + 3, 10, 7, "#4b9061");
  ellipse(c, x + 12, y, 10, 8, "#6aa872");
  ellipse(c, x + 4, y + 7, 12, 6, "#78b67c");
  ellipse(c, x + 13, y + 8, 9, 5, "#3f8258");
}
function flower(c, x, y, color = "#e5b0ae") {
  box(c, x + 4, y + 4, 1, 6, "#438551");
  box(c, x + 1, y + 2, 7, 3, color);
  box(c, x + 3, y, 3, 7, color);
  box(c, x + 3, y + 2, 3, 3, "#f9e9a2");
  box(c, x + 1, y + 7, 3, 1, "#6eac65");
}
function ground(c, tiles, zone) {
  let z = ZONES[zone];
  for (let y = 0; y < 22; y++)
    for (let x = 0; x < 30; x++) {
      let px = x * TILE,
        py = y * TILE,
        t = tiles[y][x],
        cave = z.kind === "cave";
      box(
        c,
        px,
        py,
        24,
        24,
        cave ? "#b2aa92" : z.kind === "forest" ? "#7fb578" : "#94c682",
      );
      for (let i = 0; i < 4; i++)
        box(
          c,
          px + Math.floor(noise(x, y, i) * 22),
          py + Math.floor(noise(y, x, i + 3) * 22),
          2,
          1,
          cave ? "#9b967f" : i % 2 ? "#7db673" : "#add58b",
        );
      if (t === 0 && images.ground && !cave)
        c.drawImage(images.ground, px, py, 24, 24);
      if (t === 2 && images.grass && !cave) {
        c.drawImage(images.grass, px, py, 24, 24);
        continue;
      }
      if (t === 4 && images.water) {
        c.drawImage(images.water, px, py, 24, 24);
        continue;
      }
      if (t === 3) {
        box(c, px, py, 24, 24, cave ? "#c9bda1" : "#e9d4a2");
        for (let [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ])
          if (tiles[y + dy]?.[x + dx] !== 3 && tiles[y + dy]?.[x + dx] !== 7) {
            let xx = dx < 0 ? 0 : dx > 0 ? 22 : 0,
              yy = dy < 0 ? 0 : dy > 0 ? 22 : 0;
            box(c, px + xx, py + yy, dx ? 2 : 24, dy ? 2 : 24, "#c6be85");
          }
        for (let i = 0; i < 5; i++)
          box(
            c,
            px + Math.floor(noise(x, y, i + 22) * 20) + 2,
            py + Math.floor(noise(y, x, i + 45) * 20) + 2,
            2,
            1,
            "#d8c18b",
          );
      }
      if (t === 2) {
        for (let row = 0; row < 3; row++)
          for (let col = 0; col < 4; col++) {
            let xx = px + col * 6 + (row % 2 ? 2 : 0),
              yy = py + row * 8;
            box(c, xx, yy + 3, 5, 4, cave ? "#8d8c74" : "#4c925c");
            box(c, xx + 1, yy + 1, 1, 6, cave ? "#b9b394" : "#6aad65");
            box(c, xx + 3, yy, 1, 5, cave ? "#c5bda0" : "#afd58c");
            box(c, xx + 4, yy + 2, 1, 5, "#3a8253");
          }
      }
      if (t === 4) {
        box(c, px, py, 24, 24, "#58a9ba");
        box(c, px, py + 3, 24, 1, "#72bdc8");
        box(c, px + 3, py + 13, 10, 1, "#8fd4d1");
        box(c, px + 13, py + 8, 7, 1, "#3d95ac");
        for (let [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ])
          if (tiles[y + dy]?.[x + dx] !== 4) {
            box(
              c,
              px + (dx > 0 ? 21 : 0),
              py + (dy > 0 ? 21 : 0),
              dx ? 3 : 24,
              dy ? 3 : 24,
              "#cee0b2",
            );
            box(
              c,
              px + (dx > 0 ? 23 : 0),
              py + (dy > 0 ? 23 : 0),
              dx ? 1 : 24,
              dy ? 1 : 24,
              "#e1e8b9",
            );
          }
      }
      if (t === 5) {
        ellipse(c, px + 2, py + 6, 21, 17, "#6b7b70");
        ellipse(c, px + 3, py + 3, 18, 15, "#939c88");
        box(c, px + 6, py + 5, 9, 3, "#bcc0a4");
        box(c, px + 3, py + 17, 15, 2, "#52665f");
      }
    }
  for (let y = 0; y < 22; y++)
    for (let x = 0; x < 30; x++)
      if (tiles[y][x] === 1) {
        if (z.kind === "cave") {
          box(c, x * 24, y * 24, 24, 24, "#707f72");
          box(c, x * 24 + 2, y * 24 + 2, 20, 7, "#919b83");
        } else tree(c, x * 24, y * 24);
      }
}
function building(c, b) {
  let asset =
    images[
      b.kind === "lab"
        ? "laboratory"
        : b.kind === "mart"
          ? "house-blue"
          : b.kind === "gym" || b.kind === "league"
            ? "house-gold"
            : "house-red"
    ];
  if (asset) {
    let x = b.x * 24,
      y = b.y * 24;
    buildingShadow(c, b);
    c.drawImage(asset, x, y, b.w * 24, b.h * 24);
    detailBuilding(c, b);
    if (b.kind === "center") {
      box(c, x + 76, y + 44, 15, 14, "#fff9db");
      box(c, x + 82, y + 45, 3, 12, "#cc5145");
      box(c, x + 77, y + 50, 13, 3, "#cc5145");
    }
    return;
  }
  let x = b.x * 24,
    y = b.y * 24,
    w = b.w * 24,
    h = b.h * 24,
    roof =
      b.kind === "home" ? "#ca6955" : b.kind === "lab" ? "#6c8796" : b.color;
  box(c, x + 5, y + 10, w + 5, h, "#335c3c32");
  box(c, x, y + 31, w, h - 31, "#f1e3be");
  box(c, x + 3, y + 35, w - 6, h - 40, "#ead5a7");
  box(c, x, y + h - 8, w, 8, "#b19c79");
  for (let yy = 44; yy < 102; yy += 10)
    box(c, x + 2, y + yy, w - 4, 1, "#d9c295");
  box(c, x - 4, y + 6, w + 8, 30, "#704f46");
  box(c, x - 3, y + 3, w + 6, 29, roof);
  box(c, x + 5, y, w - 10, 5, roof);
  for (let yy = 5; yy < 29; yy += 5) {
    box(c, x - 1, y + yy, w + 2, 1, "#ffffff32");
    for (let xx = yy % 10 ? 8 : 16; xx < w; xx += 16)
      box(c, x + xx, y + yy, 1, 5, "#493e4229");
  }
  box(c, x - 4, y + 32, w + 8, 4, "#6d5848");
  box(c, x + 10, y + 2, 14, 13, "#cfc7b1");
  box(c, x + 8, y, 18, 4, "#f1e5c5");
  for (let xx of [15, w - 39]) {
    box(c, x + xx - 2, y + 54, 27, 29, "#ae956f");
    box(c, x + xx, y + 53, 23, 24, "#638c9c");
    box(c, x + xx + 2, y + 55, 19, 10, "#b6d9d4");
    box(c, x + xx + 2, y + 67, 19, 8, "#8ebbc2");
    box(c, x + xx + 10, y + 54, 2, 22, "#f4dfac");
    box(c, x + xx, y + 65, 23, 2, "#f4dfac");
    box(c, x + xx - 3, y + 79, 29, 4, "#f5e7bf");
    flower(c, x + xx + 2, y + 77, "#df9199");
    flower(c, x + xx + 14, y + 77, "#dcb2db");
  }
  let doorX = b.door[0] * 24;
  box(c, doorX - 2, y + h - 31, 28, 31, "#9b8062");
  box(c, doorX, y + h - 29, 24, 29, "#4c6667");
  box(c, doorX + 3, y + h - 26, 18, 23, "#7b9c9b");
  box(c, doorX + 5, y + h - 24, 14, 7, "#a9c7b4");
  box(c, doorX + 18, y + h - 13, 2, 2, "#f8da8e");
  box(c, doorX - 3, y + h, 30, 4, "#aeb4a0");
  box(c, doorX - 5, y + h + 4, 34, 3, "#b5bea6");
  box(c, x + w / 2 - 35, y + 39, 70, 10, "#fcf0cb");
  c.fillStyle = "#685d4c";
  c.font = "bold 6px monospace";
  c.textAlign = "center";
  c.fillText(b.kind === "home" ? "HOME" : b.label, x + w / 2, y + 46);
  if (b.kind === "center") {
    box(c, x + w / 2 - 7, y + 8, 14, 14, "#faebc3");
    box(c, x + w / 2 - 2, y + 9, 4, 12, "#bb5145");
    box(c, x + w / 2 - 6, y + 13, 12, 4, "#bb5145");
  }
}
function drawOutdoorStatic(c, zone) {
  let w = layoutFor("zone:" + zone);
  ground(c, w.tiles, zone);
  detailGround(c, w, ZONES[zone]);
  for (let b of w.buildings) building(c, b);
  for (let [xx, yy] of [
    [10, 3],
    [18, 4],
    [10, 15],
    [19, 19],
    [18, 10],
    [9, 8],
    [20, 9],
    [10, 11],
    [19, 16],
    [9, 18],
  ]) {
    if (w.tiles[yy][xx] !== 0) continue;
    if (images.flowers) {
      c.drawImage(images.flowers, xx * 24, yy * 24, 24, 24);
      continue;
    }
    for (let i = 0; i < 4; i++)
      flower(
        c,
        xx * 24 + (i % 2) * 10,
        yy * 24 + Math.floor(i / 2) * 10,
        i % 2 ? "#f2c799" : "#e7a0a4",
      );
  }
  for (let o of w.objects) {
    let x = o.x * 24,
      y = o.y * 24;
    if (o.kind === "sign") {
      box(c, x + 10, y + 11, 4, 14, "#7c6b4b");
      box(c, x + 1, y + 3, 22, 14, "#7a6b4d");
      box(c, x + 3, y + 4, 18, 11, "#f5e4b5");
      box(c, x + 6, y + 7, 12, 1, "#b49e73");
      box(c, x + 6, y + 10, 9, 1, "#b49e73");
    }
    if (o.kind === "fish") {
      for (let i = 0; i < 4; i++) {
        box(c, x - 1, y + i * 6, 26, 5, "#bca47b");
        box(c, x, y + i * 6 + 4, 24, 1, "#857252");
      }
      box(c, x + 2, y, 2, 24, "#cfba8e");
      box(c, x + 21, y, 2, 24, "#cfba8e");
    }
  }
  // Fences give the town lanes a sense of scale.
  if (["town", "island"].includes(ZONES[zone].kind))
    for (let x of [9, 10, 11, 17, 18, 19]) {
      box(c, x * 24, 3 * 24 + 18, 21, 3, "#e9d9b1");
      for (let xx of [1, 18]) {
        box(c, x * 24 + xx, 3 * 24 + 9, 3, 16, "#99856a");
        box(c, x * 24 + xx, 3 * 24 + 8, 3, 11, "#f4e5c0");
      }
    }
}
function baseRoomFurniture(c, d) {
  let x = d.x * 24,
    y = d.y * 24,
    w = d.w * 24,
    h = d.h * 24;
  if (d.kind === "rug") {
    box(c, x, y, w, h, "#7a5d5740");
    box(c, x + 1, y, w - 2, h - 1, "#b9685c");
    box(c, x + 4, y + 3, w - 8, h - 7, "#e6af87");
    box(c, x + 7, y + 6, w - 14, h - 13, "#bd7864");
    for (let xx = 9; xx < w - 9; xx += 14)
      box(c, x + xx, y + 9, 5, h - 18, "#d68c70");
    return;
  }
  if (d.kind === "bed") {
    box(c, x + 2, y + 4, w - 3, h, "#785545");
    box(c, x + 1, y, w - 2, 11, "#a47b58");
    box(c, x + 5, y + 10, w - 9, h - 14, "#f9ebcf");
    box(c, x + 8, y + 14, w - 15, 13, "#e4e4cf");
    box(c, x + 8, y + 13, w - 15, 5, "#fff8e6");
    box(c, x + 5, y + 31, w - 9, h - 35, "#5c91a3");
    for (let yy = 35; yy < h - 5; yy += 9) {
      box(c, x + 7, y + yy, w - 13, 2, "#8bb8bc");
    }
    box(c, x + 5, y + h - 8, w - 9, 6, "#b3c4b4");
    box(c, x, y + h - 3, 5, 8, "#a47b58");
    box(c, x + w - 5, y + h - 3, 5, 8, "#a47b58");
    return;
  }
  if (d.kind === "plant") {
    plant(c, x, y);
    return;
  }
  if (d.kind === "window") {
    box(c, x - 3, y - 11, w + 6, 30, "#957d67");
    box(c, x - 1, y - 10, w + 2, 27, "#f8eac6");
    box(c, x + 3, y - 8, w - 6, 22, "#a5d2d2");
    box(c, x + w / 2 - 1, y - 8, 3, 23, "#f9ebce");
    box(c, x + 3, y + 2, w - 6, 2, "#f9ebce");
    box(c, x - 5, y - 12, 7, 29, "#94b29b");
    box(c, x + w - 1, y - 12, 7, 29, "#94b29b");
    box(c, x - 5, y - 12, w + 10, 4, "#c7d0af");
    return;
  }
  if (d.kind === "poster") {
    box(c, x, y - 11, 21, 29, "#9b7e63");
    box(c, x + 2, y - 9, 17, 25, "#ebddac");
    ellipse(c, x + 5, y - 2, 11, 11, "#8eb5a0");
    box(c, x + 8, y + 1, 6, 5, "#d7896b");
    return;
  }
  if (d.kind === "shelf") {
    box(c, x, y + 2, w, 22, "#8c664a");
    box(c, x + 2, y, w - 4, 20, "#b68b60");
    box(c, x + 4, y + 4, w - 8, 13, "#67533f");
    for (let xx = 6; xx < w - 4; xx += 5) {
      box(
        c,
        x + xx,
        y + 5,
        3,
        11,
        ["#b96e62", "#85a095", "#d5bd8a", "#838eaf"][Math.floor(xx / 5) % 4],
      );
      box(c, x + xx, y + 7, 3, 1, "#e4d3a5");
    }
    box(c, x, y + 18, w, 4, "#d4ac76");
    return;
  }
  if (d.kind === "desk" || d.kind === "lab-table" || d.kind === "table") {
    box(c, x + 3, y + 12, w - 6, 14, "#795b45");
    box(c, x, y + 2, w, 17, d.kind === "lab-table" ? "#b3bdb8" : "#c49a65");
    box(c, x + 2, y, w - 4, 15, d.kind === "lab-table" ? "#e2e6d5" : "#e0b77c");
    box(c, x + 3, y + 15, w - 6, 3, "#8d6d50");
    if (d.kind === "desk") {
      box(c, x + 23, y - 16, 24, 23, "#576b6c");
      box(c, x + 25, y - 14, 20, 17, "#b6d8cc");
      box(c, x + 28, y - 11, 14, 10, "#6d9e98");
      box(c, x + 20, y + 7, 29, 5, "#e2d8b3");
      box(c, x + 23, y + 8, 24, 2, "#a7a895");
      box(c, x + 2, y + 1, 13, 8, "#8c9d90");
      box(c, x + 3, y - 2, 11, 8, "#f0e7cc");
    }
    if (d.kind === "table") {
      box(c, x + 12, y + 1, 15, 7, "#ede7c8");
      plant(c, x + w - 23, y - 9);
    }
    return;
  }
  if (d.kind === "chair") {
    box(c, x + 5, y + 4, 15, 16, "#9c7651");
    box(c, x + 6, y + 5, 13, 10, "#d3ad72");
    box(c, x + 5, y + 17, 3, 9, "#795b45");
    box(c, x + 17, y + 17, 3, 9, "#795b45");
    return;
  }
  if (d.kind === "tv") {
    box(c, x + 3, y + 3, 21, 22, "#835f49");
    box(c, x, y - 12, 27, 29, "#57646a");
    box(c, x + 3, y - 9, 21, 19, "#b8cac0");
    box(c, x + 5, y - 7, 17, 15, "#86a7a0");
    box(c, x + 10, y - 5, 6, 11, "#accabe");
    box(c, x + 5, y + 12, 14, 2, "#364e56");
    box(c, x + 23, y + 12, 2, 2, "#dcae64");
    return;
  }
  if (d.kind === "sofa") {
    box(c, x, y + 3, w, 23, "#6a7b62");
    box(c, x + 2, y, w - 4, 20, "#91aa88");
    box(c, x + 5, y + 4, w - 10, 9, "#aabe99");
    box(c, x + 5, y + 15, w - 10, 8, "#7f9b78");
    for (let xx = 24; xx < w - 10; xx += 24)
      box(c, x + xx, y + 3, 2, 20, "#5f8069");
    box(c, x, y + 9, 5, 14, "#a2b78d");
    box(c, x + w - 5, y + 9, 5, 14, "#a2b78d");
    return;
  }
  if (d.kind === "kitchen") {
    box(c, x, y + 1, w, 23, "#a4ae9e");
    box(c, x + 1, y, w - 2, 10, "#ecebd6");
    for (let xx = 0; xx < w; xx += 24) {
      box(c, x + xx + 2, y + 12, 20, 10, "#c8c9af");
      box(c, x + xx + 8, y + 13, 5, 2, "#84938a");
    }
    box(c, x + 3, y + 1, 33, 7, "#7e9d9d");
    box(c, x + 7, y + 1, 24, 5, "#b1ceca");
    for (let xx of [80, 94]) {
      ellipse(c, x + xx, y, 10, 8, "#627774");
      ellipse(c, x + xx + 2, y + 2, 6, 4, "#b3c0a8");
    }
    return;
  }
  if (d.kind === "machine") {
    box(c, x, y, w, h, "#8b9f9c");
    box(c, x + 2, y - 4, w - 4, h, "#becac0");
    box(c, x + 5, y - 1, w - 10, 18, "#5b7e82");
    box(c, x + 8, y + 2, w - 16, 11, "#a4d1c2");
    for (let xx = 8; xx < w - 8; xx += 7)
      box(c, x + xx, y + 24, 3, 3, "#91ac8a");
    box(c, x + 6, y + h - 13, w - 12, 5, "#768d8a");
  }
}
function roomFurniture(c, d) {
  furnitureShadow(c, d);
  baseRoomFurniture(c, d);
  detailFurniture(c, d);
}
function roomStatic(c, scene) {
  let w = layoutFor("room:" + scene);
  box(c, 0, 0, 336, 288, "#344a45");
  for (let y = 2; y < 11; y++)
    for (let x = 1; x < 13; x++) {
      box(
        c,
        x * 24,
        y * 24,
        24,
        24,
        scene === "lab"
          ? (x + y) % 2
            ? "#d1dbcf"
            : "#c5d2c8"
          : (x + y) % 2
            ? "#dfbf91"
            : "#e4c798",
      );
      if (scene !== "lab") {
        box(c, x * 24, y * 24 + 23, 24, 1, "#bd9c75");
        box(c, x * 24 + (y % 2 ? 4 : 16), y * 24, 1, 24, "#c8a67b");
        box(c, x * 24 + 3, y * 24 + 6, 10, 1, "#cfae81");
      } else {
        box(c, x * 24, y * 24 + 23, 24, 1, "#a9bdb5");
        box(c, x * 24 + 23, y * 24, 1, 24, "#a9bdb5");
      }
    }
  box(c, 15, 0, 306, 47, "#dfd4b9");
  box(c, 15, 5, 306, 22, "#ece4cc");
  for (let x = 18; x < 320; x += 10) box(c, x, 5, 1, 23, "#e0d7bb");
  box(c, 15, 28, 306, 4, "#b9aa8b");
  box(c, 15, 32, 306, 12, "#cfc2a3");
  box(c, 15, 44, 306, 4, "#8a795f");
  box(c, 11, 0, 8, 274, "#796c57");
  box(c, 317, 0, 8, 274, "#796c57");
  box(c, 15, 48, 4, 216, "#e8d6b3");
  box(c, 313, 48, 4, 216, "#e8d6b3");
  box(c, 15, 264, 306, 12, "#a28a6b");
  box(c, 15, 274, 306, 6, "#645e50");
  detailRoom(c, scene);
  for (let d of w.decor.filter((d) => d.kind === "rug")) roomFurniture(c, d);
  // Soft daylight across the floor, like the warm interiors of the handheld games.
  c.fillStyle = "#fff7cf25";
  c.beginPath();
  c.moveTo(185, 37);
  c.lineTo(225, 37);
  c.lineTo(275, 159);
  c.lineTo(214, 159);
  c.closePath();
  c.fill();
  for (let d of w.decor
    .filter((d) => d.kind !== "rug")
    .sort((a, b) => a.y - b.y))
    roomFurniture(c, d);
  for (let o of w.objects) {
    let x = o.x * 24,
      y = o.y * 24;
    if (o.kind.startsWith("stairs")) {
      box(c, x, y, 24, 24, "#6c5c49");
      for (let i = 0; i < 5; i++) {
        box(c, x + 2, y + 3 + i * 4, 20, 3, "#c9b18b");
        box(c, x + 2, y + 5 + i * 4, 20, 1, "#e8cfa4");
      }
      box(c, x + 22, y, 2, 24, "#e8d7b2");
    }
    if (o.kind.endsWith("exit")) {
      box(c, x - 9, y, 42, 28, "#9b5d4c");
      box(c, x - 6, y + 3, 36, 23, "#bb7660");
      for (let i = 0; i < 5; i++)
        box(c, x - 4 + i * 7, y + 4, 2, 21, "#dca785");
    }
    if (o.kind === "starter-ball") {
      ellipse(c, x + 4, y - 10, 16, 6, "#405e4e44");
      ellipse(c, x + 5, y - 21, 14, 14, "#404f52");
      ellipse(c, x + 6, y - 20, 12, 12, "#f3eed4");
      box(c, x + 6, y - 19, 12, 5, "#d86354");
      box(c, x + 6, y - 14, 12, 2, "#475859");
      box(c, x + 10, y - 15, 4, 4, "#f9f4d9");
      box(c, x + 10, y - 20, 4, 1, "#f39779");
    }
  }
}
function mapCanvas(key) {
  if (cache.has(key)) return cache.get(key);
  let cv = document.createElement("canvas");
  cv.width = key.startsWith("room:") ? 336 : 720;
  cv.height = key.startsWith("room:") ? 288 : 528;
  let c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  if (key.startsWith("room:")) roomStatic(c, key.slice(5));
  else drawOutdoorStatic(c, Number(key.slice(5)));
  cache.set(key, cv);
  return cv;
}
export function drawCharacter(
  c,
  key,
  x,
  y,
  dir = "down",
  walking = false,
  tick = 0,
  stepPhase = 0,
) {
  let img = images[key] || images.red;
  if (!img) return;
  let frame = dir === "up" ? 1 : dir === "left" || dir === "right" ? 2 : 0;
  if (walking) {
    const phase = stepPhase;
    frame =
      dir === "up"
        ? 5 + phase
        : dir === "left" || dir === "right"
          ? 7 + phase
          : 3 + phase;
  }
  c.save();
  let xx = Math.round(x),
    yy = Math.round(y);
  if (dir === "right") {
    c.translate(xx + 24, 0);
    c.scale(-1, 1);
    xx = 0;
  }
  c.drawImage(img, frame * 16, 0, 16, 32, xx, yy - 24, 24, 48);
  c.restore();
}
export function cameraFor(
  player,
  mapWidth,
  mapHeight,
  viewWidth = VIEW_W,
  viewHeight = VIEW_H,
) {
  return {
    x:
      mapWidth < viewWidth
        ? (mapWidth - viewWidth) / 2
        : Math.max(
            0,
            Math.min(
              mapWidth - viewWidth,
              player.x * TILE + 12 - viewWidth / 2,
            ),
          ),
    y:
      mapHeight < viewHeight
        ? (mapHeight - viewHeight) / 2
        : Math.max(
            0,
            Math.min(
              mapHeight - viewHeight,
              player.y * TILE + 12 - viewHeight / 2,
            ),
          ),
  };
}
export function drawScene(ctx, state, tick = 0) {
  let viewW = ctx.canvas.width,
    viewH = ctx.canvas.height;
  let s = state || {
      scene: "bedroom",
      x: 5,
      y: 6,
      dir: "down",
      appearance: "red",
      zone: 0,
    },
    indoor = s.scene && s.scene !== "outdoor",
    key = indoor ? "room:" + s.scene : "zone:" + s.zone,
    background = mapCanvas(key),
    layout = layoutFor(key),
    visual = walker.update(key, s.x, s.y, tick);
  let camera = cameraFor(
    { x: visual.x / TILE, y: visual.y / TILE },
    background.width,
    background.height,
    viewW,
    viewH,
  );
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, viewW, viewH);
  box(ctx, 0, 0, viewW, viewH, indoor ? "#344a45" : "#86b877");
  ctx.save();
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
  ctx.drawImage(background, 0, 0);
  const objects = layout.objects;
  let people = objects
    .filter(
      (o) => o.character || ["trainer", "guide", "rival"].includes(o.kind),
    )
    .map((o) => ({
      ...o,
      key:
        o.character ||
        (o.kind === "rival" ? "blue" : o.kind === "trainer" ? "blue" : "mom"),
    }));
  people.push({
    x: visual.x / TILE,
    y: visual.y / TILE,
    key: s.appearance || "red",
    player: true,
  });
  people.sort((a, b) => a.y - b.y);
  for (let p of people) {
    let x = p.x * TILE,
      y = p.y * TILE;
    ellipse(ctx, x + 4, y + 18, 16, 6, "#264b3a44");
    drawCharacter(
      ctx,
      p.key,
      x,
      y,
      p.player ? s.dir : "down",
      p.player && visual.moving,
      tick,
      visual.phase,
    );
    if (
      p.player &&
      indoor &&
      s.storyStage !== "ready" &&
      s.storyStage !== "wake"
    ) {
      let goal = objects.find((o) =>
        s.storyStage === "downstairs"
          ? o.kind === "stairs-down"
          : s.storyStage === "mom"
            ? o.kind === "mom"
            : ["starter", "lab"].includes(s.storyStage)
              ? ["oak", "starter-ball"].includes(o.kind)
              : false,
      );
      if (goal) {
        box(
          ctx,
          goal.x * TILE + 9,
          goal.y * TILE - 36 + Math.round(Math.sin(tick / 200) * 2),
          7,
          7,
          "#f6d578",
        );
        box(
          ctx,
          goal.x * TILE + 11,
          goal.y * TILE - 38 + Math.round(Math.sin(tick / 200) * 2),
          3,
          11,
          "#fff3b6",
        );
      }
    }
  }
  if (!indoor) {
    const tiles = layout.tiles;
    if (tiles[s.y]?.[s.x] === 2) {
      for (let i = 0; i < 4; i++)
        box(
          ctx,
          Math.round(visual.x) + i * 6,
          Math.round(visual.y) + 20,
          3,
          4,
          "#4e975d",
        );
    }
    if (s.zone === 3) {
      ctx.fillStyle = "#1b634d25";
      ctx.fillRect(camera.x, camera.y, viewW, viewH);
    }
    for (let i = 0; i < 7; i++) {
      let x = ((i * 83 + tick * 0.005) % viewW) + camera.x,
        y = ((i * 61 + Math.sin(tick / 1300 + i) * 9) % viewH) + camera.y;
      box(ctx, x, y, 2, 1, i % 2 ? "#f7eeb86b" : "#c5e1a64d");
    }
    for (let o of objects.filter((o) => o.kind === "fish")) {
      let x = o.x * TILE - 70 + Math.sin(tick / 900) * 7,
        y = o.y * TILE + (Math.floor(tick / 700) % 2) * 8;
      box(ctx, x, y, 13, 1, "#c9ece080");
    }
  }
  animateScenery(ctx, s, tick, camera, viewW, viewH);
  ctx.restore();
  if (s.timeOfDay === "night") {
    box(ctx, 0, 0, viewW, viewH, indoor ? "#273c6a30" : "#16285277");
    if (!indoor) {
      for (let b of layout.buildings)
        for (let off of [20, 63, 90]) {
          let x = b.x * 24 + off - camera.x,
            y = (b.y + b.h) * 24 - 22 - camera.y;
          let light = ctx.createRadialGradient(x, y, 1, x, y, 26);
          light.addColorStop(0, "#ffe1a781");
          light.addColorStop(1, "#ffe1a700");
          ctx.fillStyle = light;
          ctx.fillRect(x - 26, y - 26, 52, 52);
          box(ctx, x - 5, y - 17, 10, 8, "#f5dd9cbd");
        }
    }
  }
  if (!indoor) {
    let g = ctx.createLinearGradient(0, 0, 0, viewH);
    g.addColorStop(0, "#fff7c20b");
    g.addColorStop(1, "#234c3a10");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewW, viewH);
  }
}

/** A game-native landscape for the title card, using exactly the same detailed town art. */
export function drawTitlePanorama(canvas) {
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = false;
  const map = mapCanvas("zone:0");
  c.drawImage(
    map,
    0,
    0,
    map.width,
    map.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  c.fillStyle = "#15234624";
  c.fillRect(0, 0, canvas.width, canvas.height);
}
