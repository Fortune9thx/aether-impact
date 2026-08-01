"use client";

import { motion } from "framer-motion";
import { DimensionScore } from "@/lib/types";

export function DimensionScoreRow({
  dimension,
  weight,
  index,
}: {
  dimension: DimensionScore;
  weight?: number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.1 + index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="border-b border-border py-7 last:border-b-0"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-lg text-text-primary">
          {dimension.label}
        </h3>
        <div className="flex shrink-0 items-baseline gap-4 font-mono text-sm">
          {weight !== undefined && (
            <span className="text-text-secondary">{weight}%</span>
          )}
          <span className="text-text-primary">{dimension.score}/100</span>
        </div>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${dimension.score}%` }}
          transition={{
            duration: 0.9,
            delay: 0.2 + index * 0.08,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="h-full rounded-full bg-accent"
        />
      </div>

      <p className="mt-4 max-w-[65ch] text-sm leading-relaxed text-text-secondary">
        {dimension.reasoning}
      </p>
    </motion.div>
  );
}
