import { prefersReducedMotion } from "./motion.mjs?v=2.6.1";

/** Presentation uses the already-selected opponent; it never rolls another encounter. */
export function revealFrame(progress, reduced = false) {
  const p = Math.max(0, Math.min(1, progress));
  return {
    revealed: p >= 0.46,
    opacity: Math.min(1, p / 0.16),
    rise: reduced ? 0 : Math.round((1 - Math.min(1, p / 0.6)) * 36),
    rustle: reduced ? 0 : Math.round(Math.sin(p * Math.PI * 12) * (1 - p) * 7),
  };
}

/** RAF-driven like scene fades, with a bounded timeout for backgrounded phones. */
export async function revealWild(screen, opponent) {
  const reduced = prefersReducedMotion();
  const panel = document.createElement("div");
  panel.className = "wild-encounter";
  panel.setAttribute("role", "status");
  panel.setAttribute("aria-live", "polite");
  panel.dataset.pokemonId = String(opponent.id);
  Object.assign(panel.style, {
    position: "absolute",
    inset: "0",
    zIndex: "25",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    pointerEvents: "none",
    background: "linear-gradient(180deg,#152e40dd,#254d37f5 75%)",
    color: "#fff3cc",
    textAlign: "center",
    opacity: "0",
  });
  const content = document.createElement("div");
  const title = document.createElement("p");
  title.textContent =
    opponent.habitat === "water"
      ? "Something took the bait!"
      : "Something is moving…";
  Object.assign(title.style, { fontSize: "11px", margin: "0 8px 10px" });
  const sprite = document.createElement("img");
  sprite.src = `assets/sprites/${opponent.id}.png`;
  sprite.alt = "";
  Object.assign(sprite.style, {
    width: "112px",
    height: "112px",
    imageRendering: "pixelated",
    objectFit: "contain",
    display: "block",
    margin: "auto",
    filter: "brightness(0)",
  });
  const undergrowth = document.createElement("div");
  undergrowth.textContent = opponent.habitat === "water" ? "≋ ≋ ≋" : "";
  Object.assign(undergrowth.style, {
    height: "28px",
    width: "160px",
    margin: "-16px auto 0",
    position: "relative",
    color: "#aadbd4",
    fontSize: "26px",
    background:
      opponent.habitat === "water"
        ? "transparent"
        : "repeating-conic-gradient(from 28deg at 50% 0%,#80b95c 0 26deg,#346742 26deg 65deg,transparent 65deg 180deg) 0 0/20px 28px",
  });
  const label = document.createElement("p");
  label.textContent = "Wild Pokémon";
  Object.assign(label.style, {
    fontSize: "14px",
    margin: "12px 8px 0",
    minHeight: "18px",
  });
  content.append(title, sprite, undergrowth, label);
  panel.append(content);
  screen.append(panel);
  const duration = reduced ? 800 : 1400;
  try {
    await new Promise((resolve) => {
      let start, frame, timer;
      const paint = (p) => {
        const f = revealFrame(p, reduced);
        panel.style.opacity = String(f.opacity);
        sprite.style.transform = `translateY(${f.rise}px)`;
        sprite.style.filter = f.revealed ? "none" : "brightness(0)";
        undergrowth.style.transform = `translateX(${f.rustle}px)`;
        if (f.revealed) {
          panel.dataset.phase = "revealed";
          title.textContent = "A wild Pokémon appeared!";
          label.textContent = `${opponent.name} · Lv.${opponent.level}`;
        } else panel.dataset.phase = "rustle";
      };
      const finish = () => {
        clearTimeout(timer);
        if (frame !== undefined) globalThis.cancelAnimationFrame?.(frame);
        paint(1);
        resolve();
      };
      const step = (time) => {
        start ??= time;
        const p = Math.min(1, (time - start) / duration);
        paint(p);
        if (p === 1) finish();
        else frame = requestAnimationFrame(step);
      };
      paint(0);
      timer = setTimeout(finish, duration + 300);
      if (globalThis.requestAnimationFrame) frame = requestAnimationFrame(step);
      else {
        paint(1);
        clearTimeout(timer);
        timer = setTimeout(finish, duration);
      }
    });
  } catch (error) {
    panel.remove();
    throw error;
  }
  // Hold the revealed sprite until the scene veil fully covers it.
  return () => panel.remove();
}
