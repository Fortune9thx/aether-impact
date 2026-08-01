"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// Cubic ease-out, matching the rest of the app's motion curve.
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(target: number, durationMs: number): number {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      setDisplay(Math.round(target * easeOut(progress)));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return display;
}

export function ScoreHero({
  score,
  confidence,
}: {
  score: number;
  confidence: number;
}) {
  const display = useCountUp(score, 1200);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center py-6 text-center"
    >
      <span className="text-xs uppercase tracking-[0.2em] text-accent">
        Overall Score
      </span>
      <span className="mt-5 font-serif text-[6rem] leading-none tabular-nums text-text-primary sm:text-[7.5rem]">
        {display}
      </span>
      <span className="mt-6 text-sm text-text-secondary">
        Confidence <span className="text-text-primary">{confidence}%</span>
      </span>
    </motion.div>
  );
}
