"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

export function ScoreReveal({
  score,
  label,
  size = "lg",
}: {
  score: number;
  label: string;
  size?: "lg" | "sm";
}) {
  const [display, setDisplay] = useState(0);
  const value = useMotionValue(0);
  const rounded = useTransform(value, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(value, score, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsubscribe = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center"
    >
      <span
        className={`font-serif tabular-nums text-text-primary ${
          size === "lg" ? "text-7xl" : "text-3xl"
        }`}
      >
        {display}
      </span>
      <span
        className={`mt-2 uppercase tracking-widest text-text-secondary ${
          size === "lg" ? "text-xs" : "text-[10px]"
        }`}
      >
        {label}
      </span>
    </motion.div>
  );
}
