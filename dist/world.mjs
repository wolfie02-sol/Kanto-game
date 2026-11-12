export const ZONES = [
  {
    name: "Pallet Town",
    sub: "Where your story begins",
    kind: "town",
    level: [2, 4],
    pool: [16, 19, 21, 29, 32],
    color: "#77a675",
  },
  {
    name: "Route 1",
    sub: "Pallet Town → Viridian City",
    kind: "route",
    level: [2, 5],
    pool: [16, 19, 21, 43, 25],
    color: "#87ae75",
  },
  {
    name: "Viridian City",
    sub: "The eternally green paradise",
    kind: "town",
    level: [4, 7],
    pool: [19, 29, 32, 56, 21],
    color: "#73996e",
  },
  {
    name: "Viridian Forest",
    sub: "Watch the grass. Find your path.",
    kind: "forest",
    level: [4, 9],
    pool: [10, 11, 13, 14, 25, 12, 15],
    color: "#63845e",
  },
  {
    name: "Pewter City",
    sub: "A stone gray city • Brock’s Gym",
    kind: "town",
    level: [8, 12],
    pool: [74, 27, 41, 35, 39, 23],
    gym: 0,
    color: "#8c9d78",
  },
  {
    name: "Mt. Moon",
    sub: "Ancient stone. Strange discoveries.",
    kind: "cave",
    level: [10, 16],
    pool: [41, 74, 35, 46, 27, 24, 63],
    color: "#8e8b7c",
  },
  {
    name: "Cerulean City",
    sub: "A mysterious blue aura • Misty’s Gym",
    kind: "town",
    level: [14, 20],
    pool: [54, 60, 63, 69, 48, 52, 17],
    gym: 1,
    color: "#8aaf9b",
  },
  {
    name: "Vermilion City",
    sub: "The port of exquisite sunsets",
    kind: "town",
    level: [19, 25],
    pool: [50, 51, 96, 100, 81, 83, 58, 66],
    gym: 2,
    color: "#aba67a",
  },
  {
    name: "Lavender Town",
    sub: "The noble purple town",
    kind: "town",
    level: [22, 28],
    pool: [92, 93, 104, 109, 88, 20, 22, 64],
    color: "#a099ae",
  },
  {
    name: "Celadon City",
    sub: "The city of rainbow dreams",
    kind: "town",
    level: [25, 32],
    pool: [37, 44, 70, 102, 133, 123, 127, 40, 30, 33],
    gym: 3,
    color: "#7a9e79",
  },
  {
    name: "Fuchsia City",
    sub: "A wild world awaits beyond the city",
    kind: "town",
    level: [30, 39],
    pool: [111, 113, 115, 128, 114, 84, 85, 49, 47, 45, 71, 108],
    gym: 4,
    color: "#91a87c",
  },
  {
    name: "Saffron City",
    sub: "Shining golden city of commerce",
    kind: "town",
    level: [33, 43],
    pool: [64, 97, 67, 106, 107, 122, 94, 65, 68, 95],
    gym: 5,
    color: "#ada27b",
  },
  {
    name: "Cinnabar Island",
    sub: "Fire sleeps beneath the waves",
    kind: "island",
    level: [37, 47],
    pool: [77, 78, 58, 59, 37, 38, 126, 138, 140, 142, 89, 110, 132],
    gym: 6,
    color: "#99ada0",
  },
  {
    name: "Viridian Heights",
    sub: "The final badge • Giovanni’s Gym",
    kind: "town",
    level: [42, 51],
    pool: [112, 105, 75, 76, 28, 31, 34, 143, 137, 82, 101, 103],
    gym: 7,
    color: "#788f73",
  },
  {
    name: "Indigo Plateau",
    sub: "The summit of every trainer’s journey",
    kind: "plateau",
    level: [47, 60],
    pool: [147, 148, 149, 131, 124, 125, 144, 145, 146, 150, 151],
    color: "#8f9e83",
  },
];
// Water species are available from the fishing pier in every waterside zone.
export const WATER = [
  72, 73, 79, 80, 86, 87, 90, 91, 98, 99, 116, 117, 118, 119, 120, 121, 129,
  130, 134, 135, 136, 139, 141,
];
export const GYMS = [
  {
    name: "Brock",
    badge: "Boulder",
    type: "rock",
    team: [
      [74, 12],
      [95, 14],
    ],
    money: 1400,
  },
  {
    name: "Misty",
    badge: "Cascade",
    type: "water",
    team: [
      [120, 18],
      [121, 21],
    ],
    money: 2100,
  },
  {
    name: "Lt. Surge",
    badge: "Thunder",
    type: "electric",
    team: [
      [100, 21],
      [25, 18],
      [26, 24],
    ],
    money: 2400,
  },
  {
    name: "Erika",
    badge: "Rainbow",
    type: "grass",
    team: [
      [71, 29],
      [114, 24],
      [45, 29],
    ],
    money: 2900,
  },
  {
    name: "Koga",
    badge: "Soul",
    type: "poison",
    team: [
      [109, 37],
      [89, 39],
      [109, 37],
      [110, 43],
    ],
    money: 4300,
  },
  {
    name: "Sabrina",
    badge: "Marsh",
    type: "psychic",
    team: [
      [64, 38],
      [122, 37],
      [49, 38],
      [65, 43],
    ],
    money: 4300,
  },
  {
    name: "Blaine",
    badge: "Volcano",
    type: "fire",
    team: [
      [58, 42],
      [77, 40],
      [78, 42],
      [59, 47],
    ],
    money: 4700,
  },
  {
    name: "Giovanni",
    badge: "Earth",
    type: "ground",
    team: [
      [111, 45],
      [51, 42],
      [31, 44],
      [34, 45],
      [112, 50],
    ],
    money: 5000,
  },
];
export const LEAGUE = [
  {
    name: "Lorelei",
    team: [
      [87, 54],
      [91, 53],
      [80, 54],
      [124, 56],
      [131, 56],
    ],
  },
  {
    name: "Bruno",
    team: [
      [95, 53],
      [107, 55],
      [106, 55],
      [95, 56],
      [68, 58],
    ],
  },
  {
    name: "Agatha",
    team: [
      [94, 56],
      [42, 56],
      [93, 55],
      [24, 58],
      [94, 60],
    ],
  },
  {
    name: "Lance",
    team: [
      [130, 58],
      [148, 56],
      [148, 56],
      [142, 60],
      [149, 62],
    ],
  },
  {
    name: "Champion Blue",
    team: [
      [18, 61],
      [65, 59],
      [112, 61],
      [59, 61],
      [130, 63],
      [9, 65],
    ],
  },
];
export function world(zone) {
  let z = ZONES[zone],
    tiles = Array.from({ length: 22 }, (_, y) =>
      Array.from({ length: 30 }, (_, x) => {
        if (x === 0 || x === 29 || y === 0 || y === 21) return 1;
        return 0;
      }),
    );
  for (let y = 0; y < 22; y++) for (let x = 13; x <= 15; x++) tiles[y][x] = 3;
  for (let x = 2; x < 28; x++) {
    tiles[9][x] = 3;
    tiles[17][x] = 3;
  }
  const buildings = [];
  let objs = [];
  if (["town", "island", "plateau"].includes(z.kind)) {
    buildings.push(
      {
        x: 3,
        y: 3,
        w: 6,
        h: 5,
        color: "#bc6355",
        label: "POKéMON",
        tag: "CENTER",
        kind: "center",
        door: [6, 8],
      },
      {
        x: 21,
        y: 12,
        w: 6,
        h: 5,
        color: "#7098a5",
        label: "POKé MART",
        kind: "mart",
        door: [24, 17],
      },
    );
    if (zone === 0)
      buildings.push({
        x: 3,
        y: 12,
        w: 6,
        h: 5,
        color: "#a9936b",
        label: "OAK’S LAB",
        kind: "lab",
        door: [6, 17],
      });
    else
      buildings.push({
        x: 3,
        y: 12,
        w: 6,
        h: 5,
        color: "#aa846b",
        label: "REST HOUSE",
        kind: "house",
        door: [6, 17],
      });
    buildings.push({
      x: 21,
      y: 3,
      w: 6,
      h: 5,
      color: "#ac8f5c",
      label:
        zone === 0
          ? "YOUR HOME"
          : zone === 14
            ? "LEAGUE"
            : z.gym !== undefined
              ? "GYM"
              : "TRAINER CLUB",
      kind:
        zone === 0
          ? "home"
          : zone === 14
            ? "league"
            : z.gym !== undefined
              ? "gym"
              : "club",
      door: [24, 8],
    });
    for (let b of buildings) {
      for (let y = b.y; y < b.y + b.h; y++)
        for (let x = b.x; x < b.x + b.w; x++) tiles[y][x] = 7;
      tiles[b.door[1]][b.door[0]] = 3;
      objs.push({ x: b.door[0], y: b.door[1], kind: b.kind });
    }
  } else {
    if (z.kind === "cave") {
      for (let y = 2; y < 20; y++)
        for (let x = 2; x < 28; x++)
          if ((x * 7 + y * 11) % 9 < 2 && Math.abs(x - 14) > 2) tiles[y][x] = 5;
    }
    if (z.kind === "forest") {
      for (let y = 3; y < 19; y += 4)
        for (let x of [3, 7, 21, 25]) tiles[y][x] = 1;
    }
  }
  // Small, deliberate encounter meadows with wide, safe gaps between them.
  // Buildings, paths, trees and rocks always take precedence over habitat.
  const patches = ["town", "island", "plateau"].includes(z.kind)
    ? [
        [9, 11, 3, 4],
        [18, 11, 3, 4],
        [9, 18, 3, 2],
        [22, 18, 5, 2],
      ]
    : z.kind === "forest"
      ? [
          [4, 4, 6, 4],
          [20, 4, 6, 4],
          [7, 12, 5, 4],
          [20, 16, 6, 3],
        ]
      : [
          [3, 3, 5, 3],
          [20, 4, 5, 3],
          [7, 12, 5, 4],
          [21, 16, 5, 3],
        ];
  for (const [left, top, width, height] of patches)
    for (let y = top; y < top + height; y++)
      for (let x = left; x < left + width; x++)
        if (tiles[y][x] === 0) tiles[y][x] = 2;
  for (let y = 11; y <= 15; y++) for (let x = 1; x <= 5; x++) tiles[y][x] = 4;
  for (let x = 4; x <= 8; x++) tiles[10][x] = 3;
  objs.push(
    { x: 6, y: 10, kind: "fish" },
    { x: 12, y: 6, kind: "sign" },
    { x: 17, y: 13, kind: "trainer" },
    { x: 11, y: 18, kind: "guide" },
  );
  return { tiles, buildings, objects: objs };
}
const palette = {
  ".": null,
  r: "#bd403b",
  R: "#833b35",
  k: "#343f3c",
  w: "#f9edcd",
  s: "#e6b78c",
  b: "#567c8f",
  h: "#8a7157",
};
const trainer = [
  "......rrrr......",
  ".....rrrrrr.....",
  "....rrrrwwwr....",
  "....kkssss......",
  "....ksssssk.....",
  ".....sssss......",
  ".....krrrk......",
  "....wrrrrrw.....",
  "....wrrrrrw.....",
  "....srrrrrs.....",
  ".....bbbb.......",
  ".....bbbb.......",
  ".....bb.bb......",
  ".....kk.kk......",
  "....kkk.kkk.....",
  "................",
];
export function drawPerson(ctx, x, y, npc = false, dir = "down", step = 0) {
  let lines = trainer;
  for (let yy = 0; yy < 16; yy++)
    for (let xx = 0; xx < 16; xx++) {
      let c = lines[yy][xx];
      if (c !== ".") {
        ctx.fillStyle = npc && c === "r" ? "#789366" : palette[c];
        ctx.fillRect(x + xx, y + yy, 1, 1);
      }
    }
  if (dir === "up") {
    ctx.fillStyle = npc ? "#789366" : "#bd403b";
    ctx.fillRect(x + 5, y + 3, 6, 4);
  }
  if (step) {
    ctx.fillStyle = "#343f3c";
    ctx.fillRect(x + 5, y + 14, 3, 1);
  }
}
export function drawMap(ctx, zone, player, tick = 0) {
  let { tiles, buildings, objects } = world(zone),
    z = ZONES[zone];
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 480, 352);
  for (let y = 0; y < 22; y++)
    for (let x = 0; x < 30; x++) {
      let t = tiles[y][x],
        px = x * 16,
        py = y * 16;
      ctx.fillStyle = z.kind === "cave" ? "#b9b19b" : z.color;
      ctx.fillRect(px, py, 16, 16);
      if (t === 0 || t === 7) {
        ctx.fillStyle = "#54794c44";
        ctx.fillRect(px + 3, py + 7, 2, 1);
        ctx.fillRect(px + 11, py + 3, 1, 2);
      }
      if (t === 3) {
        ctx.fillStyle = z.kind === "cave" ? "#c6bca1" : "#d4c79f";
        ctx.fillRect(px, py, 16, 16);
        ctx.fillStyle = "#b8aa8590";
        if ((x + y) % 3 === 0) {
          ctx.fillRect(px + 4, py + 5, 2, 1);
          ctx.fillRect(px + 12, py + 12, 1, 1);
        }
      }
      if (t === 2) {
        ctx.fillStyle = z.kind === "cave" ? "#827e6a" : "#54814e";
        for (let yy = 2; yy < 16; yy += 5)
          for (let xx = 1; xx < 16; xx += 5) {
            ctx.fillRect(px + xx, py + yy + 1, 4, 2);
            ctx.fillRect(px + xx + 1, py + yy - 1, 2, 3);
            ctx.fillStyle = z.kind === "cave" ? "#827e6a" : "#658f57";
          }
        ctx.fillStyle = "#acc38a";
        ctx.fillRect(px + 4, py + 4, 1, 2);
      }
      if (t === 1) {
        if (z.kind === "cave") {
          ctx.fillStyle = "#777c6e";
          ctx.fillRect(px, py, 16, 16);
          ctx.fillStyle = "#96998a";
          ctx.fillRect(px + 1, py + 1, 13, 5);
        } else {
          ctx.fillStyle = "#456d4c";
          ctx.fillRect(px + 2, py + 5, 12, 10);
          ctx.fillStyle = "#37624a";
          ctx.fillRect(px + 4, py + 1, 8, 15);
          ctx.fillStyle = "#568058";
          ctx.fillRect(px + 3, py + 4, 10, 6);
          ctx.fillStyle = "#799665";
          ctx.fillRect(px + 5, py + 2, 5, 2);
          ctx.fillStyle = "#3e6145";
          ctx.fillRect(px + 5, py + 12, 7, 3);
        }
      }
      if (t === 4) {
        ctx.fillStyle = "#74a6ab";
        ctx.fillRect(px, py, 16, 16);
        ctx.fillStyle = "#acd3c8";
        ctx.fillRect(px + (Math.floor(tick / 450) % 2 ? 2 : 7), py + 5, 6, 1);
        ctx.fillRect(px + 3, py + 12, 5, 1);
      }
      if (t === 5) {
        ctx.fillStyle = "#73796b";
        ctx.fillRect(px + 2, py + 4, 12, 10);
        ctx.fillStyle = "#a7a88c";
        ctx.fillRect(px + 4, py + 3, 8, 5);
        ctx.fillStyle = "#596352";
        ctx.fillRect(px + 3, py + 12, 10, 2);
      }
    }
  // Flowers, fence posts, and the northbound trail.
  for (let [x, y] of [
    [10, 3],
    [18, 4],
    [10, 15],
    [19, 19],
    [18, 10],
  ]) {
    if (tiles[y][x] !== 0) continue;
    ctx.fillStyle = "#ddcf8d";
    ctx.fillRect(x * 16 + 4, y * 16 + 5, 3, 3);
    ctx.fillStyle = "#c78273";
    ctx.fillRect(x * 16 + 5, y * 16 + 4, 1, 5);
    ctx.fillRect(x * 16 + 3, y * 16 + 6, 5, 1);
  }
  for (let b of buildings) {
    let x = b.x * 16,
      y = b.y * 16,
      w = b.w * 16,
      h = b.h * 16;
    ctx.fillStyle = "#42614c33";
    ctx.fillRect(x + 4, y + 5, w, h);
    ctx.fillStyle = "#e5d6ad";
    ctx.fillRect(x, y + 23, w, h - 23);
    ctx.fillStyle = "#b5ab88";
    ctx.fillRect(x, y + h - 5, w, 5);
    ctx.fillStyle = "#6b6656";
    ctx.fillRect(x - 2, y + 20, w + 4, 5);
    ctx.fillStyle = b.color;
    ctx.fillRect(x - 2, y + 4, w + 4, 18);
    ctx.fillRect(x + 5, y, w - 10, 4);
    ctx.fillStyle = "#ffffff24";
    for (let yy = 7; yy < 21; yy += 5) ctx.fillRect(x, y + yy, w, 1);
    ctx.fillStyle = "#785a4c";
    ctx.fillRect(x + 42, y + h - 21, 16, 21);
    ctx.fillStyle = "#3f4d49";
    ctx.fillRect(x + 45, y + h - 18, 10, 18);
    for (let xx of [12, 69]) {
      ctx.fillStyle = "#5e7778";
      ctx.fillRect(x + xx, y + 39, 16, 14);
      ctx.fillStyle = "#a4c5b0";
      ctx.fillRect(x + xx + 2, y + 41, 12, 5);
      ctx.fillStyle = "#d2c9a4";
      ctx.fillRect(x + xx + 7, y + 40, 2, 12);
    }
    ctx.fillStyle = "#f2e6c8";
    ctx.fillRect(x + 23, y + 27, 54, 9);
    ctx.fillStyle = "#594d41";
    ctx.font = "bold 5px monospace";
    ctx.textAlign = "center";
    ctx.fillText(b.label, x + 50, y + 33);
    if (b.kind === "center") {
      ctx.fillStyle = "#e3d6b7";
      ctx.fillRect(x + 44, y + 6, 12, 12);
      ctx.fillStyle = "#ab4840";
      ctx.fillRect(x + 48, y + 7, 4, 10);
      ctx.fillRect(x + 45, y + 10, 10, 4);
    }
  }
  for (let o of objects) {
    if (o.kind === "sign") {
      ctx.fillStyle = "#796f53";
      ctx.fillRect(o.x * 16 + 6, o.y * 16 + 6, 3, 10);
      ctx.fillStyle = "#e8ddaf";
      ctx.fillRect(o.x * 16 + 1, o.y * 16 + 2, 13, 8);
      ctx.fillStyle = "#8d8967";
      ctx.fillRect(o.x * 16 + 3, o.y * 16 + 4, 9, 1);
    }
    if (o.kind === "trainer" || o.kind === "guide")
      drawPerson(ctx, o.x * 16, o.y * 16, true);
  }
  ctx.fillStyle = "#294e3d55";
  ctx.beginPath();
  ctx.ellipse(player.x * 16 + 8, player.y * 16 + 15, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  drawPerson(
    ctx,
    player.x * 16,
    player.y * 16,
    false,
    player.dir,
    Math.floor(tick / 150) % 2,
  );
}
