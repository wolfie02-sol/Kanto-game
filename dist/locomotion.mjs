/** Refresh-rate-independent tile movement. State remains on integer tiles; only drawing interpolates. */
export function createWalker({ tile = 24, duration = 140 } = {}) {
  let motion = null;
  function sample(time) {
    const p = Math.max(0, Math.min(1, (time - motion.started) / duration));
    return {
      x: p === 1 ? motion.toX : motion.fromX + (motion.toX - motion.fromX) * p,
      y: p === 1 ? motion.toY : motion.fromY + (motion.toY - motion.fromY) * p,
      moving:
        p < 1 && (motion.fromX !== motion.toX || motion.fromY !== motion.toY),
      phase: motion.step % 2,
    };
  }
  return {
    update(key, x, y, time) {
      const toX = x * tile,
        toY = y * tile;
      if (
        !motion ||
        key !== motion.key ||
        Math.abs(toX - motion.toX) + Math.abs(toY - motion.toY) > tile
      )
        motion = {
          key,
          fromX: toX,
          fromY: toY,
          toX,
          toY,
          started: time - duration,
          step: 0,
        };
      else if (toX !== motion.toX || toY !== motion.toY) {
        const old = sample(time);
        motion = {
          key,
          fromX: old.x,
          fromY: old.y,
          toX,
          toY,
          started: time,
          step: motion.step + 1,
        };
      }
      return sample(time);
    },
  };
}
