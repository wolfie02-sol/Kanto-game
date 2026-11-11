/** Small presentation-only effects. Game state and reward settlement never depend on animation events. */
export const DURATIONS = Object.freeze({
  cover: 110,
  uncover: 140,
  battleCover: 160,
  battleUncover: 180,
  menu: 150,
  text: 110,
});
export const prefersReducedMotion = () =>
  globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Resolve even when animations are cancelled, unsupported, or a background tab stops painting. */
export async function animate(
  element,
  frames,
  duration,
  { reduced = prefersReducedMotion } = {},
) {
  if (!element || reduced() || typeof element.animate !== "function") return;
  let animation, timer;
  try {
    animation = element.animate(frames, {
      duration,
      easing: "ease-out",
      fill: "none",
    });
    await Promise.race([
      animation.finished.catch(() => {}),
      new Promise((resolve) => {
        timer = setTimeout(resolve, duration + 100);
      }),
    ]);
  } catch {
    // Unsupported or interrupted presentation must never block play.
  } finally {
    clearTimeout(timer);
    animation?.cancel();
  }
}

/** One scene change at a time. Duplicate taps are ignored, never queued as another door/battle. */
export function createSceneGate({
  cover,
  uncover,
  onLock = () => {},
  onUnlock = () => {},
}) {
  let locked = false;
  return {
    get locked() {
      return locked;
    },
    async run(kind, commit) {
      if (locked) return false;
      locked = true;
      try {
        onLock(kind);
        await cover(kind);
        commit();
        await uncover(kind);
        return true;
      } finally {
        locked = false;
        onUnlock();
      }
    },
  };
}

export function createMotion({ screen, modalRoot, clearInput }) {
  const veil = document.createElement("div");
  veil.className = "scene-transition";
  veil.setAttribute("aria-hidden", "true");
  screen.append(veil);
  const gate = createSceneGate({
    onLock(kind) {
      clearInput();
      screen.dataset.transition = kind;
      veil.classList.toggle("battle-wipe", kind === "battle");
    },
    cover: (kind) =>
      animate(
        veil,
        [{ opacity: 0 }, { opacity: 1 }],
        kind === "battle" ? DURATIONS.battleCover : DURATIONS.cover,
      ).then(() => {
        veil.style.opacity = "1";
      }),
    uncover: (kind) => {
      veil.style.opacity = "0";
      return animate(
        veil,
        [{ opacity: 1 }, { opacity: 0 }],
        kind === "battle" ? DURATIONS.battleUncover : DURATIONS.uncover,
      );
    },
    onUnlock() {
      clearInput();
      veil.style.opacity = "0";
      delete screen.dataset.transition;
    },
  });
  let menuRevision = 0,
    storyRevision = 0;
  function replace(content, battle = false) {
    menuRevision++;
    const previous = modalRoot.querySelector(".modal"),
      sameBattle = battle && previous?.classList.contains("battle-modal");
    const focused = document.activeElement;
    const action = focused?.dataset?.action,
      index = focused?.dataset?.i;
    modalRoot.innerHTML = content;
    const next = modalRoot.querySelector(".modal");
    next?.setAttribute("tabindex", "-1");
    if (!sameBattle) {
      void animate(
        next,
        [
          { opacity: 0, transform: "translateY(7px) scale(.99)" },
          { opacity: 1, transform: "none" },
        ],
        DURATIONS.menu,
      );
      if (!previous)
        void animate(
          modalRoot.querySelector(".overlay"),
          [{ opacity: 0 }, { opacity: 1 }],
          110,
        );
    } else
      void animate(
        next?.querySelector(".battle-bottom"),
        [{ opacity: 0.65 }, { opacity: 1 }],
        90,
      );
    const matching =
      action &&
      [...modalRoot.querySelectorAll("[data-action]")].find(
        (b) =>
          b.dataset.action === action && b.dataset.i === index && !b.disabled,
      );
    if (matching) matching.focus({ preventScroll: true });
    else if (
      !previous ||
      (focused &&
        modalRoot.contains(focused) === false &&
        focused !== document.body)
    )
      (next?.querySelector("input,button:not(:disabled)") || next)?.focus({
        preventScroll: true,
      });
  }
  async function dismiss() {
    const revision = ++menuRevision,
      overlay = modalRoot.firstElementChild;
    if (overlay) overlay.style.pointerEvents = "none";
    await animate(overlay, [{ opacity: 1 }, { opacity: 0 }], 100);
    if (revision === menuRevision) modalRoot.replaceChildren();
  }
  function story(element, line, paint) {
    const revision = ++storyRevision;
    if (line) {
      const opening = element.classList.contains("hidden");
      element.classList.remove("hidden");
      paint();
      void animate(
        opening ? element : element.querySelector(".story-content"),
        [
          { opacity: 0, transform: `translateY(${opening ? 6 : 2}px)` },
          { opacity: 1, transform: "none" },
        ],
        opening ? 150 : DURATIONS.text,
      );
    } else {
      void animate(element, [{ opacity: 1 }, { opacity: 0 }], 100).then(() => {
        if (revision === storyRevision) {
          element.classList.add("hidden");
          element.replaceChildren();
        }
      });
    }
  }
  return {
    get locked() {
      return gate.locked;
    },
    scene: (kind, commit) => gate.run(kind, commit),
    replace,
    dismiss,
    story,
    cue(element) {
      void animate(element, [{ opacity: 0.65 }, { opacity: 1 }], 160);
    },
    battleTurn(before, battle, action) {
      const current = [battle.player, battle.enemy];
      for (const [i, selector] of [".ally-sprite", ".foe-sprite"].entries()) {
        const sprite = modalRoot.querySelector(selector),
          p = current[i],
          old = before[i];
        if (old.id !== p.id)
          void animate(
            sprite,
            [
              { opacity: 0, transform: "translateY(8px)" },
              { opacity: 1, transform: "none" },
            ],
            180,
          );
        else if (p.hp < old.hp)
          void animate(
            sprite,
            [
              { opacity: 1, transform: "translateX(0)" },
              { opacity: 0.45, transform: `translateX(${i ? 5 : -5}px)` },
              { opacity: 1, transform: "none" },
            ],
            170,
          );
        else if (i === 0 && action.type === "move")
          void animate(
            sprite,
            [
              { transform: "translateX(0)" },
              { transform: "translateX(6px)" },
              { transform: "none" },
            ],
            140,
          );
      }
    },
  };
}
