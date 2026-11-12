/** Small presentation-only effects. Game state and reward settlement never depend on animation events. */
export const DURATIONS = Object.freeze({
  cover: 200,
  uncover: 220,
  battleCover: 250,
  battleUncover: 250,
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

/** Essential, gentle opacity feedback stays available with reduced motion and without Web Animations. */
export function fadeOpacity(element, from, to, duration) {
  if (!element) return Promise.resolve();
  if (!globalThis.requestAnimationFrame || duration <= 0) {
    element.style.opacity = String(to);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let frame,
      timer,
      started = null;
    element.style.opacity = String(from);
    const finish = () => {
      clearTimeout(timer);
      if (frame !== undefined) cancelAnimationFrame(frame);
      element.style.opacity = String(to);
      resolve();
    };
    const step = (time) => {
      started ??= time;
      const p = Math.max(0, Math.min(1, (time - started) / duration));
      element.style.opacity = String(from + (to - from) * p * p * (3 - 2 * p));
      if (p === 1) finish();
      else frame = requestAnimationFrame(step);
    };
    timer = setTimeout(finish, duration + 350);
    frame = requestAnimationFrame(step);
  });
}
function nextPaint() {
  return new Promise((resolve) => {
    let frame, timer;
    const finish = () => {
      clearTimeout(timer);
      if (frame !== undefined) globalThis.cancelAnimationFrame?.(frame);
      resolve();
    };
    timer = setTimeout(finish, 80);
    if (globalThis.requestAnimationFrame) frame = requestAnimationFrame(finish);
  });
}

/** One scene change at a time. Duplicate taps are ignored, never queued as another door/battle. */
export function createSceneGate({
  cover,
  uncover,
  paint = async () => {},
  onLock = () => {},
  onUnlock = () => {},
}) {
  let locked = false;
  return {
    get locked() {
      return locked;
    },
    async run(kind, commit, prepare) {
      if (locked) return false;
      locked = true;
      let cleanup;
      try {
        onLock(kind);
        if (prepare) cleanup = await prepare();
        await cover(kind);
        cleanup?.();
        cleanup = undefined;
        commit();
        await paint(kind);
        await uncover(kind);
        return true;
      } finally {
        cleanup?.();
        locked = false;
        onUnlock();
      }
    },
  };
}

export function createMotion({
  screen,
  modalRoot,
  clearInput,
  paintScene = () => {},
}) {
  const veil = document.createElement("div");
  veil.className = "scene-transition";
  veil.setAttribute("aria-hidden", "true");
  screen.append(veil);
  const gate = createSceneGate({
    onLock(kind) {
      clearInput();
      const fullPage = ["battle", "return", "story"].includes(kind);
      veil.classList.toggle("viewport-transition", fullPage);
      (fullPage ? document.fullscreenElement || document.body : screen).append(
        veil,
      );
      screen.dataset.transition = kind;
      screen.dataset.transitionPhase = "cover";
      veil.classList.toggle("battle-wipe", kind === "battle");
    },
    cover: (kind) =>
      fadeOpacity(
        veil,
        0,
        1,
        prefersReducedMotion()
          ? 110
          : kind === "battle"
            ? DURATIONS.battleCover
            : DURATIONS.cover,
      ),
    paint: async () => {
      screen.dataset.transitionPhase = "covered";
      paintScene();
      await nextPaint();
      await new Promise((resolve) => setTimeout(resolve, 60));
    },
    uncover: (kind) => {
      screen.dataset.transitionPhase = "uncover";
      return fadeOpacity(
        veil,
        1,
        0,
        prefersReducedMotion()
          ? 130
          : kind === "battle"
            ? DURATIONS.battleUncover
            : DURATIONS.uncover,
      );
    },
    onUnlock() {
      clearInput();
      veil.style.opacity = "0";
      screen.append(veil);
      veil.classList.remove("viewport-transition");
      delete screen.dataset.transition;
      delete screen.dataset.transitionPhase;
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
      void fadeOpacity(next, 0, 1, DURATIONS.menu);
      if (!previous)
        void fadeOpacity(modalRoot.querySelector(".overlay"), 0, 1, 110);
    } else void fadeOpacity(next?.querySelector(".battle-bottom"), 0.65, 1, 90);
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
    await fadeOpacity(overlay, 1, 0, 120);
    if (revision === menuRevision) modalRoot.replaceChildren();
  }
  function story(element, line, paint) {
    const revision = ++storyRevision;
    if (line) {
      const opening = element.classList.contains("hidden");
      element.classList.remove("hidden");
      element.style.opacity = "1";
      paint();
      void fadeOpacity(
        opening ? element : element.querySelector(".story-content"),
        0,
        1,
        opening ? 190 : DURATIONS.text,
      );
    } else {
      void fadeOpacity(element, 1, 0, 140).then(() => {
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
    scene: (kind, commit, prepare) => gate.run(kind, commit, prepare),
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
