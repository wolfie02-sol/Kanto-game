import { revealWild } from "./wild-encounter.mjs?v=2.4.2";
import { createMotion } from "./motion.mjs?v=2.4.2";
import { mountRewards } from "./rewards.mjs";
import {
  setData,
  species,
  moveData,
  stat,
  makeMon,
  heal,
  gainExp,
  expAt,
  Battle,
  validateSave,
  freshVolatile,
  hasUsableMoves,
} from "./engine.mjs";
import { ZONES, GYMS, LEAGUE, WATER, world } from "./world.mjs?v=2.4.2";
import {
  newAdventure,
  migrateAdventure,
  sanitizeName,
  storyObjective,
  roomWorld,
  sceneName,
  roomTransition,
} from "./story.mjs";
import {
  drawScene,
  loadCharacters,
  drawTitlePanorama,
} from "./renderer.mjs?v=2.4.2";
const $ = (s) => document.querySelector(s),
  root = $("#modalRoot"),
  canvas = $("#world"),
  ctx = canvas.getContext("2d");
let state = null,
  battle = null,
  modal = "",
  battleView = "actions",
  busy = false,
  lastStep = 0,
  walks = 0,
  sound = false,
  audio,
  selected = 1,
  saveTimer,
  toastTimer;
const SAVE = "kanto-journey-v1";
const motion = createMotion({
  screen: $("#screen"),
  modalRoot: root,
  clearInput: () => pressed.clear(),
  paintScene: () => drawScene(ctx, state, performance.now()),
});
let storyLines = [],
  storyAfter = null,
  draftName = "RED",
  draftRival = "BLUE",
  appearance = "red",
  zoom = matchMedia("(max-width:760px)").matches ? 3 : 2,
  areaTimer;
if (zoom === 3) {
  canvas.width = 288;
  canvas.height = 216;
  $("#zoomBtn").textContent = "⌕ Closer view";
}
const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const sprite = (id, back = false) =>
  `assets/sprites/${id}${back ? "b" : ""}.png`;
const types = (id) =>
  species(id)
    .types.map((t) => `<span class="type ${t}">${t}</span>`)
    .join("");
const hp = (p) =>
  `<div class="hp-track"><i class="${p.hp / stat(p, 0) < 0.3 ? "low" : ""}" style="width:${(p.hp / stat(p, 0)) * 100}%"></i></div><div class="hp-label">${p.hp} / ${stat(p, 0)} HP ${p.status ? `· ${p.status.toUpperCase()}` : ""}</div>`;
function beep(f = 440, d = 0.08) {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    let o = audio.createOscillator(),
      g = audio.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(f, audio.currentTime);
    g.gain.setValueAtTime(0.025, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + d);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + d);
  } catch {}
}
function toast(msg) {
  $("#toast").textContent = msg;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3200);
}
function message(msg) {
  $("#worldMessage").textContent = msg;
}
function save() {
  if (!state) return;
  try {
    let snapshot = { ...state };
    if (battle)
      snapshot.activeBattle = {
        enemies: battle.enemies,
        trainer: battle.trainer,
        pi: battle.pi,
        ei: battle.ei,
        participants: battle.participants,
        turns: battle.turns,
        outcome: battle.outcome,
        logs: battle.logs,
        meta: battle.meta,
      };
    else delete snapshot.activeBattle;
    localStorage.setItem(SAVE, JSON.stringify(snapshot));
    $("#saveState").textContent = "● SAVED ON THIS DEVICE";
  } catch {
    toast("Save storage is unavailable. Export your save from Settings.");
  }
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 200);
}
function show(content, cls = "") {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  motion.replace(
    `<div class="overlay"><section class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${modal === "starter" ? "Choose your starter" : "Game menu"}">${content}</section></div>`,
    cls === "battle-modal",
  );
}
function head(title, sub = "TRAINER MENU") {
  return `<div class="modal-head"><div><div class="eyebrow">${sub}</div><h2>${title}</h2></div><button class="close" data-action="close" aria-label="Close menu">×</button></div>`;
}
function close() {
  if (battle) return;
  if (modal === "setup" || !state) return titleScreen();
  modal = "";
  void motion.dismiss().then(() => {
    if (!modal) canvas.focus({ preventScroll: true });
  });
}
function render() {
  let z = state ? ZONES[state.zone] : ZONES[0],
    interior = sceneName(state);
  $("#trainerName").textContent = state?.trainerName || "YOUR STORY";
  $("#trainerInitial").textContent = state?.trainerName?.[0] || "?";
  $("#pageTitle").textContent =
    state?.storyStage === "ready"
      ? "Every step is a new story."
      : "There’s a whole world outside.";
  $("#chapterLabel").innerHTML =
    state?.storyStage === "ready"
      ? 'THE KANTO CHAPTER <span class="chapter-line"></span> YOUR ADVENTURE'
      : 'CHAPTER 01 <span class="chapter-line"></span> A NEW BEGINNING';
  $("#location").textContent = interior || (!state ? "Your bedroom" : z.name);
  $("#zoneSub").textContent =
    interior || !state ? "Pallet Town · Kanto" : z.sub;
  $("#mapLocation").textContent = (
    interior || (!state ? "Your bedroom" : z.name)
  ).toUpperCase();
  $("#mapRegion").textContent =
    state?.scene === "bedroom" || !state
      ? "YOUR HOME · 2F"
      : state?.scene === "living"
        ? "YOUR HOME · 1F"
        : state?.scene === "lab"
          ? "PALLET TOWN · RESEARCH LAB"
          : `KANTO REGION · ${String((state?.zone ?? 0) + 1).padStart(2, "0")}`;
  $("#money").textContent = `₽ ${(state?.money ?? 3000).toLocaleString()}`;
  $("#partyList").innerHTML = state?.party.length
    ? state.party
        .map(
          (p, i) =>
            `<button class="party-row" data-type="${species(p.id).types[0]}" data-action="detail" data-i="${i}"><img src="${sprite(p.id)}" alt="${species(p.id).name}"><div class="party-detail"><b>${species(p.id).name}</b>${hp(p)}</div><span class="party-level">Lv. ${p.level}</span></button>`,
        )
        .join("")
    : '<div class="empty-party"><span class="empty-ball"></span><p>A friend you haven’t met yet.<br>Your first partner is waiting.</p></div>';
  $("#partyCount").textContent = `${state?.party.length ?? 0} / 6 Pokémon`;
  $("#badges").innerHTML = GYMS.map(
    (g, i) =>
      `<span class="badge ${state?.badges.includes(i) ? "earned" : ""}" title="${g.badge} Badge · ${g.name}">${state?.badges.includes(i) ? "✦" : i + 1}</span>`,
  ).join("");
  $("#badgeCount").textContent = `${state?.badges.length ?? 0} / 8`;
  $("#trainerRank").textContent = state?.champion
    ? "Kanto Champion"
    : state?.badges.length
      ? `${state.badges.length}-badge trainer`
      : "Beginning trainer";
  $("#bagCount").textContent = state
    ? `${state.bag.ball} Poké Balls · ${state.bag.potion} Potions`
    : "Poké Balls, Potions & more";
  $("#timeBtn").innerHTML =
    state?.timeOfDay === "night"
      ? "<span>☾</span> NIGHT <i></i>"
      : "<span>☀</span> MORNING <i></i>";
  $("#saveState").textContent = state
    ? "● SAVED ON THIS DEVICE"
    : "● YOUR ADVENTURE AWAITS";
  let next = state ? GYMS.findIndex((_, i) => !state.badges.includes(i)) : 0;
  if (state) {
    let objective = storyObjective(state);
    if (objective) {
      $("#questTitle").textContent = objective[0];
      $("#questText").textContent = objective[1];
      $("#questAction").textContent = objective[2];
      $("#questDetail").textContent = objective[3];
      $("#questIcon").textContent = "◇";
      return;
    }
    let g = GYMS[next];
    $("#questTitle").textContent = g
      ? `Next stop: the ${g.badge} Badge.`
      : "The summit is waiting.";
    $("#questText").textContent = g
      ? `Train your team, explore the region, and challenge ${g.name} when you’re ready.`
      : state.champion
        ? "You are the Champion. Now discover every one of the original 151 Pokémon."
        : "Eight badges earned. Take on the Elite Four at Indigo Plateau.";
    $("#questAction").textContent = g
      ? `Challenge ${g.name}`
      : state.champion
        ? "Complete your Pokédex"
        : "Enter the Pokémon League";
    $("#questDetail").textContent = g
      ? `${ZONES.find((z) => z.gym === next).name} · ${g.type.toUpperCase()} type`
      : `${state.caught.length} / 151 Pokémon caught`;
    $("#questIcon").textContent = state.champion
      ? "✦"
      : String(next < 0 ? 9 : next + 1).padStart(2, "0");
  }
}
function startModal() {
  if (!state) return titleScreen();
  if (state.storyStage !== "starter")
    return toast("Professor Oak will introduce you to your first partner.");
  modal = "starter";
  show(
    `<div class="eyebrow"><span class="red-dot"></span> WELCOME TO YOUR KANTO JOURNEY</div><h2>A whole world. One first partner.</h2><p>Professor Oak has a Pokémon for you. Choose the partner who will be by your side, from Pallet Town to the Pokémon League.</p><div class="starters">${[1, 4, 7].map((id) => `<button class="starter ${selected === id ? "selected" : ""}" data-action="select-starter" data-id="${id}"><span class="dex-number">NO. ${String(id).padStart(3, "0")}</span><img src="${sprite(id)}" alt="${species(id).name}"><h3>${species(id).name}</h3>${types(id)}</button>`).join("")}</div><button class="primary starter-button" data-action="begin">Choose ${species(selected).name} →</button><p class="starter-note">No rush. The best adventures start with a friend.</p>`,
    "starter-modal",
  );
}
function begin() {
  if (!state || state.storyStage !== "starter") return;
  state.party = [makeMon(selected, 5)];
  state.starterId = selected;
  state.bag = { ball: 15, potion: 8, stone: 0 };
  state.seen = [...new Set([...state.seen, selected])];
  state.caught = [...new Set([...state.caught, selected])];
  state.storyStage = "rival";
  modal = "";
  root.innerHTML = "";
  render();
  save();
  beep(660, 0.15);
  say(
    [
      {
        speaker: "PROFESSOR OAK",
        character: "oak",
        text: `${species(selected).name} seems to have taken a liking to you already, ${state.trainerName}. Look after each other.`,
      },
      {
        speaker: state.rivalName,
        character: "blue",
        text: `Then I’m taking ${species({ 1: 4, 4: 7, 7: 1 }[selected]).name}! Come on, ${state.trainerName}. Let’s see what our partners can do!`,
      },
    ],
    startRivalBattle,
  );
}
function dialog(title, text, actions = "") {
  modal = "dialog";
  show(
    `${head(title, "KANTO STORIES")}<p class="dialog-text">${text}</p><div class="modal-actions">${actions}<button class="secondary" data-action="close">Back to the adventure</button></div>`,
  );
}
function partyModal(mode = "party") {
  if (!state) return titleScreen();
  if (!state.party.length)
    return toast("Your first companion is waiting at Oak’s lab.");
  modal = mode;
  show(
    `${head(mode === "box" ? "Pokémon storage" : "Your team", mode === "box" ? `${state.box.length} POKÉMON STORED` : "SIX PARTNERS. ENDLESS POSSIBILITIES.")}<div class="modal-list">${(mode === "box" ? state.box : state.party).map((p, i) => `<div class="modal-mon"><img src="${sprite(p.id)}" alt="${species(p.id).name}"><div><h3>${species(p.id).name} <small>Lv. ${p.level}</small></h3>${types(p.id)}${hp(p)}</div><button class="secondary" data-action="${mode === "box" ? "withdraw" : "lead"}" data-i="${i}">${mode === "box" ? "Withdraw" : i === 0 ? "Lead Pokémon" : "Make lead"}</button>${mode !== "box" && state.party.length > 1 ? `<button class="secondary" data-action="deposit" data-i="${i}">Store</button>` : ""}</div>`).join("") || "<p>Your storage is empty. Caught Pokémon join storage when your party is full.</p>"}</div><div class="modal-actions"><button class="secondary" data-action="party">Your party</button><button class="secondary" data-action="box">Storage</button></div>`,
  );
}
function detail(i) {
  let p = state.party[i];
  modal = "detail";
  show(
    `${head(species(p.id).name, `POKÉDEX NO. ${String(p.id).padStart(3, "0")} · LEVEL ${p.level}`)}<div class="modal-mon"><img style="width:110px;height:110px" src="${sprite(p.id)}" alt="${species(p.id).name}"><div>${types(p.id)}${hp(p)}<p>Attack ${stat(p, 1)} · Defense ${stat(p, 2)}<br>Special ${stat(p, 3)} · Speed ${stat(p, 4)}</p></div></div><h3 style="font-size:12px;margin-top:22px">Moves</h3><div class="help-grid">${p.moves.map((m) => `<div><b>${moveData(m.id).name}</b><p>${moveData(m.id).type.toUpperCase()} · PP ${m.pp}/${moveData(m.id).pp}<br>Power ${moveData(m.id).power ?? "—"} · Accuracy ${moveData(m.id).accuracy ?? "—"}</p></div>`).join("")}</div><div class="modal-actions"><button class="secondary" data-action="party">Manage party</button></div>`,
  );
}
function dex(q = "") {
  modal = "dex";
  let all = Object.values(window.gameData.pokemon).filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      String(p.id) === q,
  );
  show(
    `${head("The original 151", `${state?.caught.length ?? 0} CAUGHT · ${state?.seen.length ?? 0} SEEN`)}<input class="search" id="dexSearch" type="search" aria-label="Search Pokédex" placeholder="Search by name or number…" value="${q.replace(/[^a-zA-Z0-9♀♂ .]/g, "")}"><div class="dex-grid">${all.map((p) => `<div class="dex-cell ${state?.seen.includes(p.id) ? "seen" : ""}">${state?.caught.includes(p.id) ? '<span class="owned" title="Caught">●</span>' : ""}<small>#${String(p.id).padStart(3, "0")}</small><img loading="lazy" src="${sprite(p.id)}" alt="${p.name}"><b>${p.name}</b>${types(p.id)}</div>`).join("")}</div>`,
  );
  let input = $("#dexSearch");
  input.oninput = () => {
    let v = input.value,
      pos = input.selectionStart;
    dex(v);
    $("#dexSearch").focus();
    $("#dexSearch").setSelectionRange(pos, pos);
  };
}
function mapModal() {
  modal = "map";
  show(
    `${head("A region full of possibility", "THE KANTO REGION")}<p>Follow the northern trail between areas. Gyms unlock the road ahead. Once you visit a place, you can travel back here instantly.</p><div class="region-grid">${ZONES.map((z, i) => `<button class="region ${state?.zone === i ? "current" : ""}" ${state?.visited.includes(i) ? "" : "disabled"} data-action="travel" data-i="${i}"><span class="region-number">${String(i + 1).padStart(2, "0")} ${state?.visited.includes(i) ? "· DISCOVERED" : "· UNEXPLORED"}</span><b>${z.name}</b><small>${z.gym !== undefined ? `${GYMS[z.gym].name} · ${state?.badges.includes(z.gym) ? "Badge earned" : "Gym challenge"}` : z.kind === "forest" ? "Wild encounters" : z.kind === "cave" ? "Cave expedition" : "A new place to explore"}</small></button>`).join("")}</div>`,
  );
}
function bagModal() {
  if (!state) return titleScreen();
  if (!state.party.length)
    return toast("Your adventure supplies will come from Professor Oak.");
  modal = "bag";
  show(
    `${head("A little preparation goes a long way.", "TRAINER’S BAG")}<div class="shop-row"><div><b>Poké Ball × ${state.bag.ball}</b><small>Catch wild Pokémon during battle.</small></div><span>◓</span></div><div class="shop-row"><div><b>Potion × ${state.bag.potion}</b><small>Restore 20 HP to your lead Pokémon.</small></div><button class="secondary" data-action="use-potion">Use Potion</button></div><div class="shop-row"><div><b>Evolution Stone × ${state.bag.stone}</b><small>Supports stone and trade evolutions. Choose a partner below.</small></div><button class="secondary" data-action="evolve">Evolve</button></div><p>Replenish your supplies at a Poké Mart. Pokémon Centers heal your entire party for free.</p>`,
  );
}
function mart() {
  modal = "mart";
  show(
    `${head("Ready for the road?", "POKÉ MART · ₽ " + state.money.toLocaleString())}${[
      ["ball", "Poké Ball", 200, "A chance at a new teammate."],
      ["potion", "Potion", 300, "Restores 20 HP."],
      [
        "stone",
        "Evolution Stone",
        2100,
        "Stone or trade evolution for compatible Pokémon.",
      ],
    ]
      .map(
        ([key, name, price, sub]) =>
          `<div class="shop-row"><div><b>${name}</b><small>${sub}<br>In bag: ${state.bag[key]}</small></div><button class="secondary" data-action="buy" data-key="${key}" data-price="${price}">₽ ${price.toLocaleString()} · Buy</button></div>`,
      )
      .join("")}`,
  );
}
function evolveModal() {
  if (!state.bag.stone)
    return toast("Buy an Evolution Stone at a Poké Mart first.");
  modal = "evolve";
  let rows = state.party.flatMap((p, i) =>
    species(p.id)
      .evolve.filter((e) => e.trigger === 2 || e.trigger === 3)
      .map(
        (e) =>
          `<div class="modal-mon"><img src="${sprite(p.id)}" alt="${species(p.id).name}"><div><h3>${species(p.id).name} → ${species(e.id).name}</h3><small>Uses one Evolution Stone</small></div><button class="secondary" data-action="evolve-now" data-i="${i}" data-id="${e.id}">Evolve</button></div>`,
      ),
  );
  show(
    `${head("A new chapter for your partner", "EVOLUTION")}<div class="modal-list">${rows.join("") || "<p>No Pokémon in your party can use an Evolution Stone. Level evolutions happen automatically.</p>"}</div>`,
  );
}
function settings() {
  modal = "settings";
  show(
    `${head("Make yourself at home.", "SETTINGS & SAVE DATA")}<div class="help-grid"><div><b>Controls</b><p>Arrow keys / WASD · Move<br>E / Space / Enter · Interact<br>P · Party, B · Bag, M · Map<br>Escape · Open or close menu</p></div><div><b>Your progress</b><p>Automatically saved on this browser.<br>Export a backup to keep it safe.<br>Import a backup to continue elsewhere.</p></div><div><b>Battle rules</b><p>Generation I type chart, shared Special, type-based physical/special damage, STAB, critical hits, accuracy, PP, status, stat stages, catching, leveling and evolution.</p></div><div><b>About this adventure</b><p>A new fan-made adventure with original connected maps, the 151 Pokémon, eight gym challenges, and the Elite Four. No ROM or emulator required.</p></div></div><div class="modal-actions"><button class="primary" data-action="export">Export save</button><button class="secondary" data-action="import">Import save</button><button class="secondary" data-action="save">Save now</button><button class="secondary" data-action="restore-previous">Restore previous adventure</button><button class="secondary danger" data-action="reset">New adventure</button></div><input type="file" id="importFile" accept="application/json,.json" hidden><p style="font-size:10px">This is an unofficial fan game. Maps and story are original. Some specialized move effects and original hardware glitches are simplified. Assets and data: PokéAPI. Pokémon belongs to Nintendo / Creatures / GAME FREAK.</p>`,
  );
  $("#importFile").onchange = async (e) => {
    try {
      let file = e.target.files[0];
      if (!file) return;
      if (file.size > 2000000) throw Error();
      let s = JSON.parse(await file.text());
      if (!validateSave(s)) throw Error();
      delete s.activeBattle;
      for (let p of [...s.party, ...s.box]) freshVolatile(p);
      state = migrateAdventure(s);
      state.visited = Array.isArray(s.visited) ? s.visited : [s.zone];
      state.league = Number.isInteger(s.league)
        ? Math.min(4, Math.max(0, s.league))
        : 0;
      save();
      close();
      render();
      message("Welcome back! Your adventure has been restored.");
    } catch {
      toast("That save file is invalid. Your current progress is safe.");
    }
  };
}
function interact() {
  if (motion.locked || document.querySelector("#rewardsDialog[open]")) return;
  if (storyLines.length) return advanceStory();
  if (!state || modal) return;
  let w =
      state.scene !== "outdoor" ? roomWorld(state.scene) : world(state.zone),
    v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
      state.dir
    ] || [0, -1];
  let o =
    w.objects.find((o) => o.x === state.x && o.y === state.y) ||
    w.objects.find((o) => o.x === state.x + v[0] && o.y === state.y + v[1]) ||
    w.objects.find(
      (o) => Math.abs(o.x - state.x) + Math.abs(o.y - state.y) === 1,
    );
  if (!o) {
    message("Tall grass hides wild Pokémon. Follow the northern trail.");
    return;
  }
  beep();
  switch (o.kind) {
    case "stairs-down":
    case "stairs-up":
    case "home-exit":
    case "lab-exit":
      return useDoor(o.kind);
    case "mom":
      return talkMom();
    case "computer":
      return say([
        {
          speaker: "YOUR JOURNAL",
          text: "The screen flickers on. One empty page, one blinking cursor. Today feels like a good day to start writing.",
        },
      ]);
    case "tv":
      return say([
        {
          speaker: "ON TELEVISION",
          text: "A trainer and a tiny yellow Pokémon face a roaring crowd. Somewhere out there, adventures like this are happening every day.",
        },
      ]);
    case "bed":
      return say([
        {
          speaker: "HOME",
          text: "Your bed is warm, but the day has already begun. There’s a whole world outside.",
        },
      ]);
    case "home":
      return enterRoom("living", 7, 9, "up");
    case "lab":
      return enterRoom("lab", 7, 10, "up");
    case "starter-ball":
      if (state.storyStage === "starter") {
        selected = o.starter;
        return startModal();
      }
      return say([
        {
          speaker: "PROFESSOR OAK",
          character: "oak",
          text: "These little ones will find their trainers in time. Your own partner is ready to explore with you.",
        },
      ]);
    case "rival":
      return state.storyStage === "rival"
        ? startRivalBattle()
        : say([
            {
              speaker: state.rivalName,
              character: "blue",
              text: `I’m heading for the Pokémon League, ${state.trainerName}. Don’t keep me waiting!`,
            },
          ]);
    case "center":
      state.party.forEach(heal);
      state.lastCenter = state.zone;
      save();
      render();
      dialog(
        "Welcome to the Pokémon Center.",
        "Your Pokémon are fully rested. HP, status conditions, and move PP have all been restored. We hope to see you again!",
      );
      break;
    case "mart":
      mart();
      break;
    case "oak": {
      if (state.storyStage === "lab") return oakWelcome();
      if (state.storyStage === "starter")
        return say([
          {
            speaker: "PROFESSOR OAK",
            character: "oak",
            text: "Take your time. The Poké Balls on the table hold Bulbasaur, Charmander, and Squirtle. Walk up to one and press E.",
          },
        ]);
      let missing = [1, 4, 7].filter((id) => !state.caught.includes(id));
      if (state.badges.length && missing.length) {
        let id = missing[0];
        addCaught(makeMon(id, 5));
        save();
        render();
        dialog(
          "A gift from Professor Oak.",
          `You’re growing into a fine trainer! Take this ${species(id).name} with you. Come back after your first badge to collect the other starters, too.`,
        );
      } else
        dialog(
          "Professor Oak’s laboratory.",
          "A Pokémon’s strength comes from its trainer. Catch a variety of types, keep your team healthy, and take the northern trail to Pewter City. Your first Gym challenge awaits!",
        );
      break;
    }
    case "house":
      state.party.forEach(heal);
      state.bag.ball += state.defeated.includes(`rest-${state.zone}`) ? 0 : 3;
      if (!state.defeated.includes(`rest-${state.zone}`))
        state.defeated.push(`rest-${state.zone}`);
      save();
      render();
      dialog(
        "A friendly place to rest.",
        "Your party is refreshed. A local trainer has also left a few Poké Balls for first-time visitors. Travel safely!",
      );
      break;
    case "club":
      startTrainer();
      break;
    case "gym": {
      let n = ZONES[state.zone].gym,
        g = GYMS[n];
      if (state.badges.includes(n)) {
        dialog(
          `${g.name}’s Gym.`,
          `You earned the ${g.badge} Badge! Keep going, trainer. The road to Indigo awaits.`,
        );
        break;
      }
      if (state.badges.length < n) {
        dialog(
          "One step at a time.",
          `Earn the ${GYMS[n - 1].badge} Badge before taking on ${g.name}.`,
        );
        break;
      }
      dialog(
        `${g.name} is ready.`,
        `This is the ${g.type}-type Gym. ${g.name}’s team ranges from level ${Math.min(...g.team.map((p) => p[1]))} to ${Math.max(...g.team.map((p) => p[1]))}. Ready to test your team?`,
        `<button class="primary" data-action="gym-battle" data-i="${n}">Challenge ${g.name}</button>`,
      );
      break;
    }
    case "league":
      if (state.badges.length < 8)
        dialog(
          "The Pokémon League.",
          "Only trainers with all eight badges can enter the Elite Four challenge.",
        );
      else {
        let boss = LEAGUE[state.league || 0];
        dialog(
          "The final climb.",
          `${boss.name} awaits. Your party may rest between matches at the Pokémon Center. Defeat all four members of the Elite Four, then face the Champion.`,
          `<button class="primary" data-action="league-battle">Challenge ${boss.name}</button>`,
        );
      }
      break;
    case "trainer":
      startTrainer();
      break;
    case "fish":
      dialog(
        "Something stirs beneath the water.",
        "Borrow the local fishing rod. Water Pokémon here grow with the area’s level. You might even find something rare.",
        '<button class="primary" data-action="fish">Cast a line →</button>',
      );
      break;
    case "sign":
      dialog(
        ZONES[state.zone].name,
        ZONES[state.zone].sub +
          ". The trail north leads to " +
          (ZONES[state.zone + 1]?.name || "the Pokémon League") +
          ". The path south brings you back.",
      );
      break;
    case "guide":
      dialog(
        "A word from a fellow trainer.",
        "Press E beside buildings to enter. Red roofs mark Pokémon Centers; blue roofs mark Poké Marts. Walk through tall grass to meet wild Pokémon. You can switch your lead Pokémon from the party menu.",
      );
      break;
  }
}
function startTrainer() {
  let key = `trainer-${state.zone}`,
    z = ZONES[state.zone];
  if (state.defeated.includes(key)) {
    dialog(
      "A good battle, trainer.",
      "You’ve already beaten me. Keep training in the tall grass, or head to the next Gym!",
    );
    return;
  }
  let l = z.level[1],
    pool = z.pool;
  launchBattle(
    [makeMon(pool[0], l), makeMon(pool[1], Math.max(3, l - 1))],
    `Trainer ${["Milo", "Ava", "Ben", "Lena"][state.zone % 4]}`,
    { kind: "trainer", key, money: l * 60 },
  );
}
function addCaught(p) {
  if (!state.caught.includes(p.id)) state.caught.push(p.id);
  if (!state.seen.includes(p.id)) state.seen.push(p.id);
  freshVolatile(p);
  if (state.party.length < 6) state.party.push(p);
  else state.box.push(p);
}
function encounter(fish = false) {
  let z = ZONES[state.zone],
    pool = fish ? WATER : z.pool,
    level =
      z.level[0] + Math.floor(Math.random() * (z.level[1] - z.level[0] + 1));
  let id = pool[Math.floor(Math.random() * pool.length)];
  if (!fish && Math.random() < 0.12) {
    let accessible = Object.values(window.gameData.pokemon).filter(
      (p) =>
        !p.evolve.length &&
        p.base.reduce((a, b) => a + b, 0) < 250 + state.badges.length * 25 &&
        p.id < 144,
    );
    if (accessible.length)
      id = accessible[Math.floor(Math.random() * accessible.length)].id;
  }
  if ([144, 145, 146, 150, 151].includes(id) && !state.champion) {
    id = z.pool[0];
  }
  launchBattle([makeMon(id, level)], null, {
    kind: "wild",
    habitat: fish
      ? "water"
      : ZONES[state.zone].kind === "cave"
        ? "cave"
        : "grass",
  });
}
function launchBattle(enemies, trainer, meta) {
  if (!state.party.length)
    return toast("Visit Professor Oak before looking for a battle.");
  if (!state.party.some((p) => p.hp > 0)) {
    return motion.scene("return", () => {
      recover();
      render();
      save();
    });
  }
  if (motion.locked) return;
  return motion.scene(
    "battle",
    () => {
      if (modal) root.innerHTML = "";
      enemies.forEach((p) => {
        if (!state.seen.includes(p.id)) state.seen.push(p.id);
      });
      battle = new Battle(state.party, enemies, trainer);
      battle.meta = meta;
      modal = "battle";
      battleView = "actions";
      renderBattle();
      render();
      save();
      beep(220, 0.2);
    },
    meta.kind === "wild"
      ? () =>
          revealWild($("#screen"), {
            id: enemies[0].id,
            name: species(enemies[0].id).name,
            level: enemies[0].level,
            habitat: meta.habitat,
          })
      : undefined,
  );
}
function battleStats(p, who) {
  let next = p.level === 100 ? p.xp + 1 : expAt(p, p.level + 1),
    base = expAt(p, p.level);
  return `<div class="battle-stat ${who}"><h3>${species(p.id).name} <span>Lv.${p.level}</span></h3>${hp(p)}${who === "ally" ? `<div class="xp-track"><i style="width:${Math.max(0, ((p.xp - base) / (next - base)) * 100)}%"></i></div>` : ""}</div>`;
}
function renderBattle() {
  let b = battle,
    p = b.player,
    e = b.enemy;
  let actions = "";
  if (b.outcome) {
    actions = `<button class="battle-full battle-result" data-action="battle-finish">${b.outcome === "won" ? "Victory! Continue →" : b.outcome === "caught" ? "Welcome to the team! →" : "Continue →"}</button>`;
  } else if (battleView === "moves") {
    actions =
      p.moves
        .map(
          (m, i) =>
            `<button data-action="battle-move" data-i="${i}" ${(m.pp <= 0 || m.id === p.disabled) && hasUsableMoves(p) ? "disabled" : ""}>${moveData(m.id).name}<small>${moveData(m.id).type.toUpperCase()} · PP ${m.pp}/${moveData(m.id).pp}</small></button>`,
        )
        .join("") +
      '<button class="battle-full" data-action="battle-back">← Back</button>';
  } else if (battleView === "party" || p.hp <= 0) {
    actions =
      b.party
        .map(
          (q, i) =>
            `<button data-action="battle-switch" data-i="${i}" ${q.hp <= 0 || i === b.pi ? "disabled" : ""}>${species(q.id).name} <small>Lv.${q.level} · ${q.hp}/${stat(q, 0)} HP</small></button>`,
        )
        .join("") +
      (p.hp > 0
        ? '<button class="battle-full" data-action="battle-back">← Back</button>'
        : "");
  } else if (battleView === "bag") {
    actions = `<button data-action="battle-ball" ${b.trainer || state.bag.ball === 0 ? "disabled" : ""}>◓ Poké Ball <small>${state.bag.ball} in your bag</small></button><button data-action="battle-potion" ${state.bag.potion === 0 ? "disabled" : ""}>+ Potion <small>${state.bag.potion} in your bag · +20 HP</small></button><button class="battle-full" data-action="battle-back">← Back</button>`;
  } else {
    actions = `<button class="fight" data-action="battle-fight">FIGHT <small>Choose a move →</small></button><button data-action="battle-bag">BAG <small>Items & Poké Balls</small></button><button data-action="battle-party">POKÉMON <small>Switch your partner</small></button><button data-action="battle-run" ${b.trainer ? "disabled" : ""}>RUN <small>Escape this encounter</small></button>`;
  }
  show(
    `<div class="battle-header"><b>${b.trainer ? `VS. ${b.trainer}` : "A wild encounter"}</b><span>${ZONES[state.zone].name.toUpperCase()} · TURN ${b.turns + 1}</span></div><div class="battle-scene">${battleStats(e, "foe")}<img class="foe-sprite" src="${sprite(e.id)}" alt="${species(e.id).name}"><img class="ally-sprite" src="${sprite(p.id, true)}" alt="${species(p.id).name}">${battleStats(p, "ally")}</div><div class="battle-bottom"><div class="battle-log" role="log" aria-live="polite">${!b.outcome ? `<p class="battle-prompt">What will ${species(p.id).name.toUpperCase()} do?</p>` : ""}${b.logs.map((s) => `<p>${s}</p>`).join("")}</div><div class="battle-actions">${actions}</div></div>`,
    "battle-modal",
  );
  let log = $(".battle-log");
  log.scrollTop = 0;
}
function battleAct(action) {
  if (busy || motion.locked) return;
  const before = [battle.player, battle.enemy].map((p) => ({
    id: p.id,
    hp: p.hp,
  }));
  busy = true;
  battle.act(action, state.bag);
  if (battle.meta.kind === "intro" && battle.outcome === "lost")
    battle.logs = battle.logs.map((text) =>
      text.includes("Returning to the Pokémon Center")
        ? "Professor Oak will help your Pokémon recover."
        : text,
    );
  for (let p of state.party) {
    let id = p.transformed || p.id;
    if (!state.caught.includes(id)) state.caught.push(id);
    if (!state.seen.includes(id)) state.seen.push(id);
  }
  battleView = "actions";
  renderBattle();
  motion.battleTurn(before, battle, action);
  render();
  save();
  beep(180, 0.12);
  setTimeout(() => {
    busy = false;
  }, 220);
}
function recover() {
  state.party.forEach(heal);
  state.scene = "outdoor";
  state.zone = state.lastCenter ?? 0;
  state.x = 14;
  state.y = 17;
  state.money = Math.floor(state.money * 0.9);
  state.league = 0;
  message("Your team has recovered. Take a breath, then try again.");
}
function finishBattle() {
  if (!battle?.outcome || motion.locked) return;
  return motion.scene("return", settleBattle);
}
function settleBattle() {
  let b = battle;
  if (!b?.outcome) return;
  if (b.meta.kind === "intro") {
    state.party.forEach(heal);
    state.storyStage = "ready";
    battle = null;
    modal = "";
    root.innerHTML = "";
    render();
    save();
    say(
      [
        {
          speaker: "PROFESSOR OAK",
          character: "oak",
          text: "That’s the spirit! Winning is only one part of being a trainer. Learning to trust your partner is what really matters.",
        },
        {
          speaker: "PROFESSOR OAK",
          character: "oak",
          text: `Here, ${state.trainerName}. Take this Pokédex, some Poké Balls, and a few Potions. I’ve heard unusual Pokémon are appearing beyond Viridian Forest. Help me discover what’s happening.`,
        },
        {
          speaker: state.rivalName,
          character: "blue",
          text: "A mystery, eight Gyms, and a whole region to explore? Now we’re talking. See you on the road!",
        },
        {
          speaker: "YOUR ADVENTURE BEGINS",
          text: "The door is open. Your first partner is by your side. Head north through Pallet Town toward Route 1.",
        },
      ],
      () => {
        message("Head north. Your Kanto journey has begun.");
        learnPending();
      },
    );
    return;
  }
  if (b.outcome === "caught") {
    let p = b.enemy;
    freshVolatile(p);
    addCaught(p);
    message(
      `${species(p.id).name} ${state.party.includes(p) ? "joined your party" : "was sent to storage"}!`,
    );
  }
  if (b.outcome === "won") {
    let meta = b.meta;
    if (meta.kind === "gym") {
      state.badges.push(meta.i);
      state.money += GYMS[meta.i].money;
      state.bag.ball += 5;
      state.bag.potion += 2;
      toast(`${GYMS[meta.i].badge} Badge earned! +5 Poké Balls +2 Potions`);
      message(
        `You earned the ${GYMS[meta.i].badge} Badge. The northern trail is open!`,
      );
    } else if (meta.kind === "trainer") {
      state.defeated.push(meta.key);
      state.money += meta.money;
      message(`A great battle. You earned ₽${meta.money}!`);
    } else if (meta.kind === "league") {
      state.money += 5000;
      state.league = (state.league || 0) + 1;
      if (state.league === 5) {
        state.league = 0;
        state.champion = true;
        toast(
          "You are the Kanto Champion! Legendary encounters are now unlocked.",
        );
        message(
          "Kanto Champion! The original 151 are waiting to be discovered.",
        );
      } else {
        toast(`${b.trainer} defeated! ${LEAGUE[state.league].name} is next.`);
        message(
          "Next League challenge unlocked. Heal your team before continuing.",
        );
      }
    } else {
      state.money += 30;
      message("Every battle brings you a little closer.");
    }
  }
  if (b.outcome === "lost") recover();
  state.party.forEach(freshVolatile);
  battle = null;
  modal = "";
  root.innerHTML = "";
  render();
  save();
  canvas.focus({ preventScroll: true });
  learnPending();
}
function learnPending() {
  let i = state.party.findIndex((p) => p.learnQueue?.length);
  if (i < 0) return;
  let p = state.party[i],
    id = p.learnQueue[0];
  modal = "learn";
  show(
    `${head(`${species(p.id).name} wants to learn ${moveData(id).name}.`, "A NEW MOVE")}<p>A Pokémon can know four moves. Choose a move to forget, or keep your current moves.</p><div class="help-grid">${p.moves.map((m, j) => `<button class="secondary" data-action="learn-move" data-i="${i}" data-slot="${j}">Forget ${moveData(m.id).name}<small style="display:block;margin-top:6px">${moveData(m.id).type.toUpperCase()} · ${m.pp}/${moveData(m.id).pp} PP</small></button>`).join("")}</div><div class="modal-actions"><button class="secondary" data-action="learn-skip" data-i="${i}">Keep current moves</button></div>`,
  );
}
function move(dir) {
  if (motion.locked || document.querySelector("#rewardsDialog[open]")) return;
  if (!state || modal || battle || storyLines.length) return;
  let now = performance.now();
  if (now - lastStep < 140) return;
  lastStep = now;
  state.dir = dir;
  let [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
      dir
    ],
    nx = state.x + dx,
    ny = state.y + dy,
    indoor = state.scene !== "outdoor";
  if (!indoor && (ny <= 0 || ny >= 21)) {
    if (state.zone === 0 && ny <= 0 && !state.party.length) {
      say([
        {
          speaker: "A VOICE FROM DOWN THE LANE",
          character: "oak",
          text: "Wait! It’s dangerous to travel through the tall grass without a Pokémon. Meet me at my laboratory first.",
        },
      ]);
      return;
    }
    let next = state.zone + (ny <= 0 ? 1 : -1);
    if (next < 0 || next >= ZONES.length) {
      message(
        next < 0
          ? "The sea stretches beyond Pallet Town."
          : "The Pokémon League is waiting inside.",
      );
      return;
    }
    let gym = ZONES[state.zone].gym;
    if (ny <= 0 && gym !== undefined && !state.badges.includes(gym)) {
      message(
        `Earn ${GYMS[gym].name}’s ${GYMS[gym].badge} Badge to continue north.`,
      );
      beep(130);
      return;
    }
    if (next === 14 && state.badges.length < 8) {
      message("Eight Gym Badges are required to enter Indigo Plateau.");
      return;
    }
    return motion.scene("route", () => {
      state.zone = next;
      state.y = ny <= 0 ? 19 : 2;
      state.x = 14;
      if (!state.visited.includes(next)) state.visited.push(next);
      render();
      areaNotice(ZONES[next].name);
      message(ZONES[next].sub);
      save();
    });
  }
  let w = indoor ? roomWorld(state.scene) : world(state.zone);
  if (
    nx < 1 ||
    nx >= w.tiles[0].length - 1 ||
    (ny < 2 && indoor) ||
    ny < 1 ||
    ny >= w.tiles.length - 1 ||
    [1, 4, 5, 7].includes(w.tiles[ny]?.[nx])
  )
    return;
  let occupied = w.objects.find(
    (o) =>
      o.x === nx &&
      o.y === ny &&
      ["trainer", "guide", "sign", "mom", "oak", "rival"].includes(o.kind),
  );
  if (occupied) {
    message("Press E to talk.");
    return;
  }
  state.x = nx;
  state.y = ny;
  canvas.setAttribute("data-position", `${state.x},${state.y}`);
  walks++;
  scheduleSave();
  let obj = w.objects.find((o) => o.x === nx && o.y === ny);
  if (
    obj &&
    [
      "gym",
      "center",
      "mart",
      "lab",
      "league",
      "club",
      "house",
      "home",
      "stairs-down",
      "stairs-up",
      "home-exit",
      "lab-exit",
    ].includes(obj.kind)
  ) {
    interact();
    return;
  }
  if (
    !indoor &&
    w.tiles[ny][nx] === 2 &&
    walks > 4 &&
    state.party.length &&
    Math.random() < 0.16
  ) {
    walks = 0;
    encounter();
  } else if (walks % 24 === 0)
    message(
      indoor
        ? "Make yourself at home. Press E beside things to explore."
        : "Explore the grass, or keep following the northern trail.",
    );
}
function areaNotice(name) {
  $("#areaNotice").innerHTML =
    `${escapeHTML(name)}<small>THE KANTO REGION</small>`;
  $("#areaNotice").classList.remove("hidden");
  clearTimeout(areaTimer);
  areaTimer = setTimeout(() => $("#areaNotice").classList.add("hidden"), 2100);
}
function titleScreen() {
  if (battle) return;
  modal = "title";
  show(
    `<div class="title-layout"><div class="title-illustration"><canvas id="titlePanorama" width="480" height="360" aria-hidden="true"></canvas><span class="illustration-star">✧</span><div class="hero-sprite"></div><img class="title-pokemon" src="${sprite(1)}" alt="Bulbasaur"><img class="title-pokemon second" src="${sprite(25)}" alt="Pikachu"><span class="illustration-label">PALLET TOWN · KANTO</span></div><div class="title-copy"><div class="eyebrow">POKÉMON · KANTO JOURNEY</div><h2>A whole world.<br>Waiting for you.</h2><p>A familiar room. A small town. A first Pokémon.<br>A whole world waiting to know your name.</p><div class="title-features"><span>151 POKÉMON</span><span>8 GYM BADGES</span><span>YOUR COLLECTOR JOURNEY</span></div><div class="title-buttons">${state ? `<button class="primary" data-action="continue-game">Continue as ${escapeHTML(state.trainerName)} <span>→</span></button>` : ""}<button class="${state ? "secondary" : "primary"}" data-action="setup">${state ? "Begin a new story" : "Begin your story"} <span>→</span></button>${state ? `<button class="secondary" data-action="opening-help">See the new opening <span>↗</span></button>` : ""}</div><p class="title-footnote">All 151 original Pokémon. Your own Kanto story.<br>Keyboard and touch controls · Saved on this device</p></div></div>`,
    "title-modal",
  );
  drawTitlePanorama($("#titlePanorama"));
}
function setupScreen() {
  modal = "setup";
  show(
    `${head("What should we call you?", "THIS IS YOUR STORY")}<p>Every trainer has a name. Every adventure starts with a first step.</p><div class="setup-layout"><div class="setup-trainer"><div class="hero-sprite" style="background-image:url('assets/characters/${appearance}.png')"></div><small>YOUR TRAINER</small></div><div class="setup-form"><label for="nameInput">Your name</label><input id="nameInput" maxlength="12" autocomplete="off" value="${escapeHTML(draftName)}" placeholder="Enter your name"><label>Choose your look</label><div class="appearance-options"><button class="${appearance === "red" ? "selected" : ""}" data-action="appearance" data-look="red"><span class="mini-person"></span>Red</button><button class="${appearance === "leaf" ? "selected" : ""}" data-action="appearance" data-look="leaf"><span class="mini-person leaf"></span>Leaf</button></div><label for="rivalInput">And your rival’s name?</label><input id="rivalInput" maxlength="12" autocomplete="off" value="${escapeHTML(draftRival)}" placeholder="BLUE"></div></div><div class="setup-footer"><p>${state ? "Your current adventure will be backed up on this device before the new one begins." : "You’ll wake up at home in Pallet Town. There’s no need to rush."}</p><button class="primary" data-action="new-story">Begin in Pallet Town →</button></div>`,
    "setup-modal",
  );
}
function captureNames() {
  draftName = $("#nameInput")?.value ?? draftName;
  draftRival = $("#rivalInput")?.value ?? draftRival;
}
function beginStory() {
  if (motion.locked) return;
  return motion.scene("story", () => {
    captureNames();
    if (state)
      try {
        localStorage.setItem(SAVE + "-previous", JSON.stringify(state));
      } catch {}
    state = newAdventure(draftName, appearance, draftRival);
    battle = null;
    modal = "";
    root.innerHTML = "";
    storyLines = [];
    pressed.clear();
    render();
    save();
    message("Morning sunlight spills across the floor.");
    resumeStory();
  });
}
function say(lines, after = null) {
  storyLines = lines;
  storyAfter = after;
  pressed.clear();
  paintStory();
}
function paintStory() {
  let line = storyLines[0],
    el = $("#storyDialog");
  $("#screen").classList.toggle("dialogue-open", !!line);
  motion.story(el, line, () => {
    el.innerHTML = `${line.character ? `<div class="speaker-avatar" style="background-image:url('assets/characters/${line.character}.png')"></div>` : ""}<div class="story-content"><span class="speaker-label">${escapeHTML(line.speaker)}</span><p>${escapeHTML(line.text)}</p><button class="story-next" id="storyNext">${storyLines.length > 1 ? "CONTINUE" : "LET’S GO"} <kbd>E / A</kbd> <span class="dialog-caret">▾</span></button></div>`;
    $("#storyNext").onclick = advanceStory;
  });
}
function advanceStory() {
  if (motion.locked || !storyLines.length) return;
  beep(550, 0.04);
  storyLines.shift();
  let done = storyLines.length === 0 ? storyAfter : null;
  if (!storyLines.length) storyAfter = null;
  paintStory();
  if (done) done();
}
function resumeStory() {
  if (!state) return;
  if (state.storyStage === "wake")
    say(
      [
        {
          speaker: "A NEW BEGINNING",
          text: "Sunlight slips through your bedroom window. Somewhere downstairs, a kettle whistles. For a moment, everything feels just like any other morning.",
        },
        {
          speaker: "MOM",
          character: "mom",
          text: `${state.trainerName}! You’re awake! Professor Oak called earlier. He said today might be the start of something special. Come downstairs before you go!`,
        },
      ],
      () => {
        state.storyStage = "downstairs";
        render();
        save();
        message("Find the stairs in the southeast corner of your room.");
      },
    );
  else if (state.storyStage === "rival")
    say(
      [
        {
          speaker: state.rivalName,
          character: "blue",
          text: `Ready, ${state.trainerName}? Our first battle! Professor Oak will make sure our Pokémon are all right afterward.`,
        },
      ],
      startRivalBattle,
    );
  else if (state.storyStage === "lab" && state.scene === "lab") oakWelcome();
}
function enterRoom(scene, x, y, dir = "up") {
  if (motion.locked) return;
  return motion.scene("door", () => {
    state.scene = scene;
    state.x = x;
    state.y = y;
    state.dir = dir;
    pressed.clear();
    modal = "";
    root.innerHTML = "";
    render();
    save();
    message(
      scene === "lab"
        ? "A room full of possibilities. Professor Oak is just ahead."
        : "A familiar place. A moment to catch your breath.",
    );
    if (scene === "lab" && state.storyStage === "lab") oakWelcome();
  });
}
function useDoor(kind) {
  if (
    kind === "home-exit" &&
    ["wake", "downstairs", "mom"].includes(state.storyStage)
  ) {
    say([
      {
        speaker: "MOM",
        character: "mom",
        text: `Before you go, ${state.trainerName}, come talk to me! I have something for you.`,
      },
    ]);
    return;
  }
  if (kind === "lab-exit" && ["starter", "rival"].includes(state.storyStage)) {
    say([
      {
        speaker: "PROFESSOR OAK",
        character: "oak",
        text:
          state.storyStage === "starter"
            ? "Don’t forget your first Pokémon! Choose a Poké Ball from the table."
            : "One moment! Your rival is waiting for your first practice battle.",
      },
    ]);
    return;
  }
  let t = roomTransition(kind);
  if (!t) return;
  return motion.scene("door", () => {
    Object.assign(state, t);
    if (
      kind === "stairs-down" &&
      ["wake", "downstairs"].includes(state.storyStage)
    )
      state.storyStage = "mom";
    pressed.clear();
    render();
    save();
    message(
      state.scene === "outdoor"
        ? "Pallet Town. The beginning of everything."
        : "Make yourself at home. Press E to talk or explore.",
    );
    if (state.scene === "outdoor") areaNotice("Pallet Town");
  });
}
function talkMom() {
  if (["wake", "downstairs", "mom"].includes(state.storyStage)) {
    say(
      [
        {
          speaker: "MOM",
          character: "mom",
          text: `There you are, ${state.trainerName}. I still remember when you could barely see over this table. Now you’re off to meet your first Pokémon.`,
        },
        {
          speaker: "MOM",
          character: "mom",
          text: "I’ve packed your bag. Professor Oak’s laboratory is in the southwest part of town. He and your rival are already waiting for you.",
        },
        {
          speaker: "MOM",
          character: "mom",
          text: "Visit home whenever you need a rest. And don’t forget: you don’t have to know where the whole road leads. Just take the first step.",
        },
      ],
      () => {
        state.storyStage = "lab";
        render();
        save();
        message(
          "Mom packed your bag. Find Oak’s Lab in southwest Pallet Town.",
        );
      },
    );
  } else {
    state.party.forEach(heal);
    render();
    save();
    say([
      {
        speaker: "MOM",
        character: "mom",
        text: `Welcome home, ${state.trainerName}. You and your Pokémon look like you could use a little rest. There. All better. I’m proud of you.`,
      },
    ]);
  }
}
function oakWelcome() {
  say(
    [
      {
        speaker: "PROFESSOR OAK",
        character: "oak",
        text: `Ah, ${state.trainerName}! Welcome. For years I’ve studied the Pokémon of Kanto, but lately something unusual has caught my attention.`,
      },
      {
        speaker: "PROFESSOR OAK",
        character: "oak",
        text: "Trainers have reported rare Pokémon along the old forest paths. I need someone curious, kind, and brave enough to see the world with fresh eyes.",
      },
      {
        speaker: state.rivalName,
        character: "blue",
        text: "That’s where we come in, right? I’ve been ready since sunrise!",
      },
      {
        speaker: "PROFESSOR OAK",
        character: "oak",
        text: "First things first. A trainer should never travel alone. On this table are three Pokémon: Bulbasaur, Charmander, and Squirtle. Walk up to a Poké Ball and press E. Choose a friend.",
      },
    ],
    () => {
      state.storyStage = "starter";
      render();
      save();
      message("Walk to one of the three Poké Balls and press E.");
    },
  );
}
function startRivalBattle() {
  if (state.storyStage !== "rival") return;
  let id = { 1: 4, 4: 7, 7: 1 }[state.starterId || state.party[0].id] || 4;
  state.party.forEach(heal);
  launchBattle([makeMon(id, 5)], state.rivalName, { kind: "intro" });
}
root.addEventListener("click", (e) => {
  let button = e.target.closest("[data-action]");
  if (!button || button.disabled || motion.locked) return;
  let a = button.dataset.action,
    i = Number(button.dataset.i),
    id = Number(button.dataset.id);
  if (a === "setup") return setupScreen();
  if (a === "opening-help")
    return dialog(
      "Your new opening awaits.",
      "Choose Begin a new story on the title screen to name your trainer and wake up in your bedroom. Your current progress is preserved when you choose Continue.",
    );
  if (a === "appearance") {
    captureNames();
    appearance = button.dataset.look === "leaf" ? "leaf" : "red";
    return setupScreen();
  }
  if (a === "new-story") return beginStory();
  if (a === "continue-game") {
    return motion.scene("story", () => {
      modal = "";
      root.innerHTML = "";
      render();
      resumeStory();
      if (!storyLines.length) learnPending();
      canvas.focus({ preventScroll: true });
    });
  }
  if (a === "close") return close();
  if (a === "select-starter") {
    selected = id;
    return startModal();
  }
  if (a === "begin") return begin();
  if (a === "battle-fight") {
    battleView = "moves";
    return renderBattle();
  }
  if (a === "battle-back") {
    battleView = "actions";
    return renderBattle();
  }
  if (a === "battle-party") {
    battleView = "party";
    return renderBattle();
  }
  if (a === "battle-bag") {
    battleView = "bag";
    return renderBattle();
  }
  if (a === "battle-move") return battleAct({ type: "move", index: i });
  if (a === "battle-switch") return battleAct({ type: "switch", index: i });
  if (a === "battle-ball") return battleAct({ type: "ball" });
  if (a === "battle-potion") return battleAct({ type: "potion" });
  if (a === "battle-run") return battleAct({ type: "run" });
  if (a === "battle-finish") return finishBattle();
  if (a === "learn-move" || a === "learn-skip") {
    let p = state.party[i],
      next = p.learnQueue?.shift();
    if (!next) return;
    if (a === "learn-move") {
      let slot = Number(button.dataset.slot);
      if (slot >= 0 && slot < 4)
        p.moves[slot] = { id: next, pp: moveData(next).pp };
      toast(`${species(p.id).name} learned ${moveData(next).name}!`);
    }
    modal = "";
    root.innerHTML = "";
    save();
    render();
    return learnPending();
  }
  if (a === "party") return partyModal();
  if (a === "box") return partyModal("box");
  if (a === "detail") return detail(i);
  if (a === "lead") {
    if (!state.party[i].hp) return toast("That Pokémon needs to rest first.");
    [state.party[0], state.party[i]] = [state.party[i], state.party[0]];
    save();
    render();
    return partyModal();
  }
  if (a === "deposit") {
    if (
      state.party.length <= 1 ||
      !state.party.some((p, j) => j !== i && p.hp > 0)
    )
      return toast("Keep at least one healthy partner in your party.");
    state.box.push(state.party.splice(i, 1)[0]);
    save();
    render();
    return partyModal();
  }
  if (a === "withdraw") {
    if (state.party.length >= 6)
      return toast("Your party is full. Store a Pokémon first.");
    state.party.push(state.box.splice(i, 1)[0]);
    save();
    render();
    return partyModal("box");
  }
  if (a === "travel") {
    if (!state.visited.includes(i)) return;
    if (!state.party.length) return toast("Visit Oak before setting off.");
    state.scene = "outdoor";
    state.zone = i;
    state.x = 14;
    state.y = 17;
    close();
    render();
    save();
    return message("Welcome back to " + ZONES[i].name + ".");
  }
  if (a === "buy") {
    let key = button.dataset.key,
      price = Number(button.dataset.price);
    if (!["ball", "potion", "stone"].includes(key)) return;
    if (state.money < price)
      return toast(
        "You need a little more money. Battle trainers to earn some.",
      );
    state.money -= price;
    state.bag[key]++;
    save();
    render();
    beep(770);
    return mart();
  }
  if (a === "use-potion") {
    let p = state.party[0];
    if (!state.bag.potion) return toast("No Potions left.");
    if (!p.hp) return toast("A fainted Pokémon needs a Pokémon Center.");
    if (p.hp === stat(p, 0))
      return toast("Your lead Pokémon is already at full health.");
    p.hp = Math.min(stat(p, 0), p.hp + 20);
    state.bag.potion--;
    save();
    render();
    toast("Your lead Pokémon recovered 20 HP.");
    return bagModal();
  }
  if (a === "evolve") return evolveModal();
  if (a === "evolve-now") {
    let p = state.party[i];
    if (
      !state.bag.stone ||
      !species(p.id).evolve.some(
        (ev) => ev.id === id && (ev.trigger === 2 || ev.trigger === 3),
      )
    )
      return;
    let old = species(p.id).name,
      oldHP = stat(p, 0);
    p.id = id;
    p.hp = p.hp === 0 ? 0 : Math.max(0, p.hp + stat(p, 0) - oldHP);
    state.bag.stone--;
    if (!state.caught.includes(id)) state.caught.push(id);
    if (!state.seen.includes(id)) state.seen.push(id);
    save();
    render();
    toast(`${old} evolved into ${species(id).name}!`);
    return partyModal();
  }
  if (a === "gym-battle") {
    let g = GYMS[i];
    return launchBattle(
      g.team.map(([id, l]) => makeMon(id, l)),
      g.name,
      { kind: "gym", i },
    );
  }
  if (a === "league-battle") {
    let g = LEAGUE[state.league || 0];
    return launchBattle(
      g.team.map(([id, l]) => makeMon(id, l)),
      g.name,
      { kind: "league" },
    );
  }
  if (a === "fish") return encounter(true);
  if (a === "restore-previous") {
    try {
      let raw =
        localStorage.getItem(SAVE + "-previous") ||
        localStorage.getItem(SAVE + "-backup-v1");
      if (!raw)
        return toast("No previous adventure is available on this device.");
      let previous = JSON.parse(raw);
      if (!validateSave(previous))
        return toast("The previous adventure could not be restored.");
      localStorage.setItem(SAVE + "-previous", JSON.stringify(state));
      delete previous.activeBattle;
      state = migrateAdventure(previous);
      storyLines = [];
      paintStory();
      modal = "";
      root.innerHTML = "";
      render();
      save();
      titleScreen();
      toast("Your previous adventure has been restored.");
    } catch {
      toast("The previous adventure could not be restored.");
    }
    return;
  }
  if (a === "save") {
    save();
    return toast("Your adventure is saved.");
  }
  if (a === "export") {
    let blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "kanto-journey-save.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (a === "import") return $("#importFile").click();
  if (a === "reset") {
    modal = "reset";
    return show(
      `${head("Start a new story?", "NEW ADVENTURE")}<p>This replaces your progress on this browser. Export a save first if you want to keep your current adventure.</p><div class="modal-actions"><button class="primary" data-action="reset-confirm">Start a new adventure</button><button class="secondary" data-action="close">Keep playing</button></div>`,
    );
  }
  if (a === "reset-confirm") {
    modal = "";
    captureNames();
    return setupScreen();
  }
});
document.addEventListener("click", (e) => {
  let b = e.target.closest('[data-action="detail"]');
  if (b && !root.contains(b) && state && !modal) detail(Number(b.dataset.i));
});
$("#partyBtn").onclick = () => {
  if (!motion.locked && !battle && !storyLines.length) partyModal();
};
$("#boxBtn").onclick = () => {
  if (!motion.locked && !battle && !storyLines.length) partyModal("box");
};
$("#bagBtn").onclick = () => {
  if (!motion.locked && !battle && !storyLines.length) bagModal();
};
$("#settingsBtn").onclick = () => {
  if (motion.locked || battle || storyLines.length) return;
  state ? settings() : titleScreen();
};
document.querySelector(".brand").onclick = (e) => {
  e.preventDefault();
  if (!motion.locked && !battle && !storyLines.length) titleScreen();
};
$("#timeBtn").onclick = () => {
  if (!state || motion.locked) return;
  motion.cue(canvas);
  state.timeOfDay = state.timeOfDay === "night" ? "morning" : "night";
  render();
  save();
};
$("#zoomBtn").onclick = () => {
  motion.cue(canvas);
  zoom = zoom === 2 ? 3 : 2;
  canvas.width = zoom === 2 ? 384 : 288;
  canvas.height = zoom === 2 ? 288 : 216;
  $("#zoomBtn").textContent = zoom === 2 ? "⌕ Close view" : "⌕ Closer view";
};
$("#fullscreenBtn").onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else {
    const target = matchMedia("(max-width:760px), (pointer:coarse)").matches
      ? document.querySelector(".game-column")
      : $("#screen");
    target
      .requestFullscreen?.()
      .catch(() =>
        toast(
          "Fullscreen is unavailable in this browser. You can keep playing here.",
        ),
      );
  }
};
$("#mapBtn").onclick = () => {
  if (!motion.locked && !battle && !storyLines.length) mapModal();
};
$("#interactBtn").onclick = interact;
$("#touchA").onclick = interact;
$("#touchB").onclick = () => {
  if (!motion.locked && !battle && !storyLines.length)
    modal ? close() : state ? settings() : titleScreen();
};
$("#soundBtn").onclick = () => {
  sound = !sound;
  $("#soundBtn").textContent = sound ? "♫ Sound on" : "♫ Sound off";
  beep(660);
};
document.querySelectorAll("[data-view]").forEach(
  (b) =>
    (b.onclick = () => {
      if (motion.locked || battle || storyLines.length) return;
      let v = b.dataset.view;
      if (v === "adventure") close();
      if (v === "dex") dex();
      if (v === "map") mapModal();
      if (v === "collect") openCollector();
    }),
);
const keys = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
};
let pressed = new Set();
document.addEventListener("keydown", (e) => {
  if (e.key === "Tab" && modal && root.firstElementChild) {
    const controls = [
      ...root.querySelectorAll(
        'button:not(:disabled),input,select,[tabindex="0"]',
      ),
    ];
    const first = controls[0],
      last = controls.at(-1);
    if (
      e.shiftKey &&
      (document.activeElement === first ||
        !root.contains(document.activeElement))
    ) {
      e.preventDefault();
      last?.focus();
    } else if (
      !e.shiftKey &&
      (document.activeElement === last ||
        !root.contains(document.activeElement))
    ) {
      e.preventDefault();
      first?.focus();
    }
    return;
  }
  if (motion.locked || document.querySelector("#rewardsDialog[open]")) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
  if (keys[e.key]) {
    e.preventDefault();
    pressed.add(keys[e.key]);
    move(keys[e.key]);
  }
  if ([" ", "Enter", "e", "E"].includes(e.key)) {
    e.preventDefault();
    if (!e.repeat) interact();
  }
  if (e.key === "Escape") {
    if (motion.locked || battle || storyLines.length) return;
    modal ? close() : state ? settings() : startModal();
  }
  if (!modal && state && !storyLines.length) {
    if (e.key === "p" || e.key === "P") partyModal();
    if (e.key === "b" || e.key === "B") bagModal();
    if (e.key === "m" || e.key === "M") mapModal();
  }
});
document.addEventListener("keyup", (e) => {
  if (keys[e.key]) pressed.delete(keys[e.key]);
});
window.addEventListener("blur", () => pressed.clear());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pressed.clear();
    save();
  }
});
let activeDpadPointer = null;
document.querySelectorAll("[data-dir]").forEach((button) => {
  button.onpointerdown = (event) => {
    if (event.isPrimary === false || event.button > 0) return;
    event.preventDefault();
    activeDpadPointer = event.pointerId;
    pressed.clear();
    try {
      button.setPointerCapture(event.pointerId);
    } catch {}
    pressed.add(button.dataset.dir);
    move(button.dataset.dir);
  };
  button.onpointerup =
    button.onpointercancel =
    button.onlostpointercapture =
      (event) => {
        if (event.pointerId !== activeDpadPointer) return;
        activeDpadPointer = null;
        pressed.clear();
      };
});
window.addEventListener("beforeunload", save);
function loop(t) {
  if (pressed.size) move([...pressed].at(-1));
  if (state) canvas.setAttribute("data-position", `${state.x},${state.y}`);
  drawScene(ctx, state, t);
  requestAnimationFrame(loop);
}

try {
  let response = await fetch("assets/data.json");
  if (!response.ok) throw Error("Data failed to load");
  let data = await response.json();
  window.gameData = data;
  setData(data);
  await loadCharacters();
  try {
    let raw = localStorage.getItem(SAVE);
    if (raw) {
      let s = JSON.parse(raw);
      if (validateSave(s)) {
        if (s.version === 1 && !localStorage.getItem(SAVE + "-backup-v1"))
          localStorage.setItem(SAVE + "-backup-v1", raw);
        state = migrateAdventure(s);
        state.visited ??= [state.zone];
      } else
        toast(
          "Your old save could not be loaded. Import a valid backup in Settings.",
        );
    }
  } catch {}
  render();
  requestAnimationFrame(loop);
  if (!state) titleScreen();
  else {
    message("Welcome back, trainer. Your story continues.");
    let saved = state.activeBattle;
    delete state.activeBattle;
    if (
      saved &&
      Array.isArray(saved.enemies) &&
      saved.enemies.length > 0 &&
      saved.enemies.every(
        (p) =>
          species(p.id) &&
          Array.isArray(p.moves) &&
          p.moves.every((m) => moveData(m.id)),
      ) &&
      saved.pi >= 0 &&
      saved.pi < state.party.length &&
      saved.ei >= 0 &&
      saved.ei < saved.enemies.length
    ) {
      battle = Object.assign(Object.create(Battle.prototype), saved, {
        party: state.party,
        rng: Math.random,
      });
      modal = "battle";
      renderBattle();
    }
    if (!battle) titleScreen();
    canvas.focus({ preventScroll: true });
  }
} catch (e) {
  root.innerHTML =
    '<div class="overlay"><section class="modal"><h2>The adventure needs a moment.</h2><p>Game assets could not load. Please refresh the page.</p><button class="primary" onclick="location.reload()">Try again</button></section></div>';
  console.error(e);
}

mountRewards({
  data: () => window.gameData,
  canOpen: () => {
    if (motion.locked || battle || modal || storyLines.length) {
      toast("Finish your current dialogue or battle first.");
      return false;
    }
    return true;
  },
});

function openCollector() {
  if (motion.locked || battle || storyLines.length) return;
  const rewards = $("#rewardsBtn");
  if (rewards) {
    if (modal) close();
    rewards.click();
    return;
  }
  dialog(
    "A journey worth collecting.",
    "Defeat guardian challenges, earn a pack, and open it for shards or a card entitlement. Save shards for the exchange. The playable rewards sandbox and Collector Crypt development adapter are available in the GitHub build; this hosted adventure does not issue cards.",
  );
}
$("#collectorInfoBtn").onclick = openCollector;
