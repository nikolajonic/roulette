import { useEffect, useRef } from "react";

export type UseSpinCycleOpts = {
  intervalMs: number;
  animMs: number;
  resultShowMs: number;
  pauseWhenHidden?: boolean;

  spin: () => number;
  onResolve: (result: number) => void;
  onSpinningChange?: (spinning: boolean) => void;
  onOverlayChange?: (visible: boolean) => void;
  onNextSpinAtChange?: (ts: number | null) => void;
};

export default function useSpinCycle({
  intervalMs,
  animMs,
  resultShowMs,
  pauseWhenHidden = true,
  spin,
  onResolve,
  onSpinningChange,
  onOverlayChange,
  onNextSpinAtChange,
}: UseSpinCycleOpts) {
  const timerRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const schedule = (delay: number) => {
    clearTimer();
    const nextAt = Date.now() + delay;
    timerRef.current = window.setTimeout(runOnce, delay);
    onNextSpinAtChange?.(nextAt);
  };

  const runOnce = () => {
    if (pauseWhenHidden && document.hidden) {
      schedule(1000);
      return;
    }
    if (runningRef.current) {
      schedule(1000);
      return;
    }

    runningRef.current = true;
    onSpinningChange?.(true);
    onNextSpinAtChange?.(null);

    const result = spin();
    onResolve(result);

    window.setTimeout(() => {
      onOverlayChange?.(true);

      window.setTimeout(() => {
        onOverlayChange?.(false);
        runningRef.current = false;
        onSpinningChange?.(false);
        schedule(intervalMs);
      }, resultShowMs);
    }, animMs);
  };

  useEffect(() => {
    schedule(intervalMs);
    return () => {
      clearTimer();
      onNextSpinAtChange?.(null);
    };
  }, []);
}
