/** Original pixel details, drawn on the game's native 24px grid and cached with each map.
 * Visual only: no new obstacles, encounters or collision tiles. */
const px = (c, x, y, w, h, color) => {
  c.fillStyle = color;
  c.fillRect(
    Math.round(x),
    Math.round(y),
    Math.max(1, Math.round(w)),
    Math.max(1, Math.round(h)),
  );
};
const hash = (x, y, seed = 0) => {
  let n = Math.imul(x + seed * 127, 374761393) ^ Math.imul(y + 17, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
function leaf(c, x, y, color) {
  px(c, x, y, 5, 2, color);
  px(c, x + 1, y - 1, 3, 4, color);
  px(c, x + 2, y, 1, 2, "#b5d78b");
}
function blossom(c, x, y, color) {
  px(c, x - 1, y + 2, 1, 4, "#315e45");
  px(c, x - 2, y, 5, 2, color);
  px(c, x, y - 2, 1, 5, color);
  px(c, x, y, 1, 1, "#ffe4a0");
}
function pot(c, x, y) {
  px(c, x - 5, y, 11, 2, "#d19468");
  px(c, x - 4, y + 2, 9, 6, "#a65e46");
  px(c, x - 2, y + 2, 2, 5, "#d48a62");
  leaf(c, x - 4, y - 4, "#458057");
  leaf(c, x + 1, y - 7, "#6d9e68");
  leaf(c, x - 1, y - 10, "#4e8558");
}

export function detailGround(c, w, zone) {
  const cave = zone.kind === "cave",
    forest = zone.kind === "forest";
  for (let y = 1; y < w.tiles.length - 1; y++)
    for (let x = 1; x < w.tiles[y].length - 1; x++) {
      const t = w.tiles[y][x],
        xx = x * 24,
        yy = y * 24,
        n = hash(x, y);
      if (t === 0) {
        // Clusters, rather than uniform noise, give the floor a hand-drawn rhythm.
        if (n > 0.48) {
          const ox = 4 + Math.floor(hash(y, x) * 13),
            oy = 5 + Math.floor(hash(x, y, 8) * 12);
          px(c, xx + ox, yy + oy, 3, 1, cave ? "#96927c" : "#73a46a");
          px(c, xx + ox + 2, yy + oy - 2, 1, 2, cave ? "#c0b99c" : "#b3d48a");
        }
        if (!cave && n > 0.82) {
          const ox = 5 + Math.floor(hash(y, x, 3) * 12);
          leaf(c, xx + ox, yy + 16, forest ? "#5c8d59" : "#7ca967");
        }
        if (!cave && n > 0.94) {
          blossom(c, xx + 8, yy + 12, "#e9d29f");
          blossom(c, xx + 14, yy + 17, "#d9b4b5");
        }
        for (const [dx, dy] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ])
          if ([3, 4].includes(w.tiles[y + dy]?.[x + dx])) {
            const water = w.tiles[y + dy][x + dx] === 4;
            for (let i = 0; i < 24; i += 4) {
              const p = Math.floor(hash(x + i, y) * 3);
              px(
                c,
                xx + (dx > 0 ? 21 : dx < 0 ? 0 : i),
                yy + (dy > 0 ? 21 : dy < 0 ? 0 : i),
                dx ? 3 : 3,
                dy ? 3 : 3,
                water ? "#8da97d" : "#638653",
              );
              if (!water)
                px(
                  c,
                  xx + (dx > 0 ? 22 : dx < 0 ? 0 : i),
                  yy + (dy > 0 ? 22 : dy < 0 ? 0 : i),
                  dx ? 2 : 3,
                  dy ? 2 : 3,
                  "#c8be89",
                );
            }
          }
      }
      if (t === 3) {
        // Warm worn lanes with sparse stones and broken grass borders.
        if (n > 0.35) {
          const ox = 3 + Math.floor(hash(x, y, 6) * 16),
            oy = 5 + Math.floor(hash(y, x, 5) * 14);
          px(c, xx + ox, yy + oy, 3, 2, "#b5a181");
          px(c, xx + ox, yy + oy, 2, 1, "#e0cda2");
        }
        if (n > 0.85) px(c, xx + 8, yy + 17, 6, 1, "#b3a17f");
      }
      if (t === 4) {
        if (n > 0.45) {
          px(c, xx + 3, yy + 5, 9, 1, "#90c8d0");
          px(c, xx + 5, yy + 6, 7, 1, "#4b98ad");
          px(c, xx + 14, yy + 17, 5, 1, "#c2dedd");
        }
      }
      if (t === 5) {
        px(c, xx + 7, yy + 6, 7, 1, "#d0cbb0");
        px(c, xx + 6, yy + 7, 2, 3, "#bbc0a5");
        px(c, xx + 11, yy + 13, 5, 1, "#687c6e");
      }
      if (t === 1 && !cave && n > 0.5) {
        // Ferns at tree roots, without redrawing tree canopies.
        leaf(c, xx + 3, yy + 22, "#47784e");
        leaf(c, xx + 8, yy + 20, "#5b8a57");
      }
    }
}
export function buildingShadow(c, b) {
  const x = b.x * 24,
    y = b.y * 24,
    w = b.w * 24,
    h = b.h * 24;
  px(c, x + 7, y + h - 3, w + 3, 9, "#284a3938");
  px(c, x + w, y + 27, 6, h - 20, "#294a3930");
}
export function detailBuilding(c, b) {
  const x = b.x * 24,
    y = b.y * 24,
    w = b.w * 24,
    h = b.h * 24,
    door = b.door[0] * 24;
  // Mortared foundation, rain gutter and alternating roof seams.
  px(c, x + 2, y + h - 5, w - 4, 3, "#8b8f7c");
  px(c, x + 3, y + h - 6, w - 6, 1, "#d5d0b2");
  for (let i = 6; i < w - 8; i += 13) px(c, x + i, y + h - 4, 1, 2, "#68796b");
  px(c, x + 3, y + Math.floor(h * 0.39), w - 6, 2, "#483e3e70");
  for (let row = 8; row < h * 0.34; row += 7)
    for (let col = 10 + (row % 2) * 4; col < w - 7; col += 13) {
      px(c, x + col, y + row, 7, 1, "#f0d2b82b");
      px(c, x + col + 6, y + row + 1, 1, 4, "#222e442f");
    }
  // A shaded chimney and terracotta cap on residential buildings.
  if (["home", "house", "center"].includes(b.kind)) {
    px(c, x + w - 25, y + 4, 10, 17, "#685a50");
    px(c, x + w - 24, y + 4, 6, 16, "#b1a08a");
    px(c, x + w - 27, y + 2, 14, 4, "#ded0b5");
    px(c, x + w - 24, y + 3, 8, 1, "#564f4d");
    for (let i = 8; i < 19; i += 4) px(c, x + w - 24, y + i, 7, 1, "#8b7d6c");
  }
  // Doorstep tiles and a doormat stay within existing walkable door frontage.
  px(c, door - 3, y + h - 1, 30, 4, "#bfc2a7");
  px(c, door - 1, y + h, 26, 1, "#e4dec1");
  px(c, door + 5, y + h + 4, 15, 3, "#8f7460");
  if (w >= 100) {
    for (const ox of [15, w - 29]) {
      px(c, x + ox, y + h - 23, 15, 2, "#9d7b59");
      px(c, x + ox + 1, y + h - 21, 13, 3, "#b58b64");
      for (let i = 0; i < 3; i++)
        blossom(
          c,
          x + ox + 3 + i * 4,
          y + h - 26,
          ["#df9c9a", "#edc68d", "#d2b4df"][i],
        );
    }
  }
  const label = {
    lab: "LAB",
    gym: "GYM",
    mart: "MART",
    center: "P.C.",
    league: "LEAGUE",
    home: "HOME",
  }[b.kind];
  if (label) {
    const width = Math.max(25, label.length * 5 + 10),
      cx = x + w * 0.5;
    px(c, cx - width / 2 - 1, y + h - 42, width + 2, 11, "#5a6261");
    px(c, cx - width / 2, y + h - 42, width, 9, "#e8e0bf");
    c.fillStyle = "#404c50";
    c.font = "bold 6px monospace";
    c.textAlign = "center";
    c.fillText(label, cx, y + h - 35);
  }
  if (b.kind === "lab") {
    px(c, x + 15, y + 8, 1, 16, "#ddd5ba");
    px(c, x + 10, y + 8, 13, 1, "#e9e2c9");
    px(c, x + 13, y + 5, 6, 1, "#9caeaa");
  }
}
export function furnitureShadow(c, d) {
  if (["rug", "window", "poster"].includes(d.kind)) return;
  px(c, d.x * 24 + 4, d.y * 24 + 18, d.w * 24 - 1, 8, "#483c372b");
}
export function detailFurniture(c, d) {
  const x = d.x * 24,
    y = d.y * 24,
    w = d.w * 24,
    h = d.h * 24;
  if (d.kind === "rug") {
    for (let i = 4; i < w - 3; i += 5) {
      px(c, x + i, y - 1, 2, 2, "#e8c49b");
      px(c, x + i, y + h - 1, 2, 2, "#e8c49b");
    }
    for (let xx = 12; xx < w - 12; xx += 12)
      for (let yy = 11; yy < h - 10; yy += 12) {
        px(c, x + xx, y + yy, 3, 1, "#e5b68c");
        px(c, x + xx + 1, y + yy - 1, 1, 3, "#e5b68c");
      }
  }
  if (d.kind === "bed") {
    px(c, x + 6, y + 34, 3, h - 42, "#3e6983");
    px(c, x + w - 10, y + 34, 4, h - 42, "#507d91");
    for (let yy = 37; yy < h - 10; yy += 7)
      for (let xx = 10; xx < w - 11; xx += 8) {
        px(c, x + xx, y + yy, 3, 1, "#c0d4c4");
        px(c, x + xx + 1, y + yy - 1, 1, 3, "#c0d4c4");
      }
    px(c, x + 9, y + 17, w - 18, 1, "#c4c7b5");
    px(c, x + 10, y + 14, w - 20, 1, "#fff9de");
  }
  if (["desk", "table", "lab-table"].includes(d.kind)) {
    if (d.kind !== "lab-table")
      for (let i = 5; i < w - 8; i += 14) px(c, x + i, y + 5, 9, 1, "#be925f");
    if (d.kind === "table") {
      px(c, x + 10, y, 13, 6, "#f0e2c0");
      px(c, x + 16, y, 1, 5, "#c4b89c");
      px(c, x + 11, y + 2, 4, 1, "#82917c");
      px(c, x + w / 2, y + 1, 5, 5, "#e9e4c8");
      px(c, x + w / 2 + 4, y + 2, 2, 2, "#c9b991");
    }
    if (d.kind === "desk") {
      for (let i = 0; i < 6; i++) px(c, x + 24 + i * 3, y + 9, 2, 1, "#687674");
      px(c, x + 27, y - 9, 1, 7, "#9dcec0");
      px(c, x + 30, y - 9, 9, 1, "#a5d7bc");
      px(c, x + 30, y - 6, 6, 1, "#74b5ac");
      px(c, x + 3, y + 1, 8, 1, "#c89672");
    }
    if (d.kind === "lab-table") {
      px(c, x + 4, y + 1, w - 8, 1, "#f6f2de");
      for (let i = 0; i < w / 24; i++) {
        px(c, x + 8 + i * 24, y + 17, 10, 4, "#7d9795");
        px(c, x + 13 + i * 24, y + 18, 2, 1, "#e2e0bf");
      }
    }
  }
  if (d.kind === "shelf") {
    for (let i = 7; i < w - 7; i += 10) {
      px(c, x + i, y + 6, 1, 8, "#eee0b642");
      px(c, x + i, y + 10, 3, 1, "#e6d4aa");
    }
    px(c, x + 2, y + 21, w - 4, 1, "#725545");
  }
  if (d.kind === "tv") {
    px(c, x + 6, y - 6, 15, 1, "#d0ddd0");
    px(c, x + 7, y - 4, 1, 5, "#b3d1bf");
    px(c, x + 3, y + 14, 8, 1, "#384b4f");
    px(c, x + 21, y + 12, 2, 2, "#d8b56a");
  }
  if (d.kind === "sofa") {
    for (let xx = 11; xx < w - 8; xx += 13)
      px(c, x + xx, y + 8, 1, 2, "#7b997b");
    px(c, x + 3, y + 1, 2, 17, "#c4cf9d");
    px(c, x + w - 5, y + 1, 2, 17, "#69856c");
  }
  if (d.kind === "window") {
    px(c, x + 5, y - 6, Math.max(2, w / 3 - 5), 2, "#d9ece0");
    px(c, x + 6, y - 4, 2, 8, "#c5ded8");
    for (const dx of [-4, w + 1])
      for (let i = 0; i < 4; i++) px(c, x + dx, y - 8 + i * 5, 3, 1, "#618f82");
  }
  if (d.kind === "poster") {
    px(c, x + 5, y - 5, 11, 1, "#b5c7a5");
    px(c, x + 4, y + 11, 13, 1, "#9b8e70");
    px(c, x + 8, y + 8, 6, 1, "#d2a17c");
  }
}
export function detailRoom(c, scene) {
  const lab = scene === "lab";
  for (let y = 2; y < 11; y++)
    for (let x = 1; x < 13; x++) {
      if (lab && hash(x, y, 4) > 0.55) {
        px(c, x * 24 + 2, y * 24 + 2, 4, 1, "#e7ecda66");
        px(c, x * 24 + 2, y * 24 + 3, 1, 3, "#e3e9d866");
      } else if (!lab) {
        const ox = 4 + Math.floor(hash(x, y, 2) * 12);
        px(c, x * 24 + ox, y * 24 + 10, 7, 1, "#b8936b42");
        px(c, x * 24 + ox + 3, y * 24 + 12, 4, 1, "#edcf9d");
      }
    }
  // Wallpaper, dado rail, floor edge shadow and a little framed clock.
  for (let x = 24; x < 310; x += 12) {
    px(c, x, 10, 2, 2, lab ? "#bdcbc1" : "#d6c2a0");
    px(c, x + 4, 18, 1, 2, lab ? "#d5dfce" : "#f8e9c6");
  }
  px(c, 19, 47, 294, 3, "#735c4435");
  px(c, 19, 51, 294, 2, "#82695014");
  const cx = scene === "lab" ? 47 : 145;
  px(c, cx, 8, 15, 16, "#8a6d53");
  px(c, cx + 2, 9, 11, 13, "#eee6c6");
  px(c, cx + 7, 12, 1, 6, "#5c645b");
  px(c, cx + 7, 17, 4, 1, "#5c645b");
  px(c, cx + 6, 10, 2, 1, "#c1ab7a");
  if (scene === "bedroom") {
    // A trainer's map and small bag beside the desk, entirely decorative.
    px(c, 81, 9, 26, 27, "#786c5a");
    px(c, 83, 11, 22, 23, "#e7dfbe");
    px(c, 86, 15, 6, 8, "#89ab86");
    px(c, 92, 19, 9, 11, "#a8bf91");
    px(c, 92, 13, 6, 7, "#92bbc1");
    px(c, 86, 26, 10, 1, "#d2b489");
    px(c, 153, 218, 15, 17, "#5b766c");
    px(c, 156, 216, 9, 3, "#416257");
    px(c, 155, 222, 11, 5, "#91a389");
    px(c, 160, 225, 2, 2, "#d6be7b");
  }
  if (scene === "living") {
    pot(c, 34, 46);
    px(c, 266, 18, 20, 16, "#786451");
    px(c, 268, 20, 16, 12, "#d5c6a1");
    px(c, 272, 24, 8, 6, "#78a083");
  }
  if (lab) {
    px(c, 246, 7, 43, 27, "#5e7877");
    px(c, 248, 9, 39, 23, "#cbded0");
    for (let i = 0; i < 3; i++) {
      px(c, 251, 12 + i * 6, 16 + i * 4, 1, "#759b92");
      px(c, 278, 12 + i * 6, 5, 2, ["#81a99b", "#a7bd8b", "#c39e7b"][i]);
    }
  }
}
export function animateScenery(c, state, tick, camera, viewW, viewH) {
  if (state.scene !== "outdoor") return;
  // Only a few visible glints; expensive static textures stay in the map cache.
  if (state.timeOfDay !== "night")
    for (let i = 0; i < 3; i++) {
      const x = 130 + i * 141,
        y = 420 + (i % 2) * 7;
      if (
        x < camera.x - 20 ||
        x > camera.x + viewW + 20 ||
        y < camera.y - 20 ||
        y > camera.y + viewH + 20
      )
        continue;
      px(
        c,
        x + Math.floor(Math.sin(tick / 1300 + i) * 3),
        y,
        6,
        1,
        "#dfefdc65",
      );
    }
}
