import { useEffect, useRef, useState } from "react";

// Turns the loader's real progress into a smooth 0–100 number and
// calls onDone once it has reached 100 and held for cfg.holdMs.
export default function useLoaderProgress(loader, cfg, onDone) {
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let raf;
    let shown = 0;
    let last = performance.now();
    const start = last;
    let reachedAt = null;
    let finished = false;

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      if (cfg.timeoutMs && now - start > cfg.timeoutMs) loader.complete();

      let target = loader.getProgress();
      const settled = now - loader.lastAdded >= cfg.settleMs;
      const minTimeDone = now - start >= cfg.minDurationMs;
      if (target >= 100 && !(settled && minTimeDone)) target = 99;

      let step = (target - shown) * (1 - Math.exp(-dt * cfg.easing));
      step = Math.max(step, Math.min(cfg.minSpeed * dt, target - shown));
      step = Math.min(step, cfg.maxSpeed * dt);
      shown = Math.min(target, shown + Math.max(step, 0));
      if (target - shown < 0.05) shown = target;

      const whole = Math.floor(shown + 1e-6);
      setProgress((p) => (p === whole ? p : whole));

      if (shown >= 100 && !finished) {
        reachedAt ??= now;
        if (now - reachedAt >= cfg.holdMs) {
          finished = true;
          doneRef.current?.();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loader, cfg]);

  return progress;
}
