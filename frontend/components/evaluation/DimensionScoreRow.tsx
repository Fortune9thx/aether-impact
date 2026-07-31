"use client";

import { motion } from "framer-motion";
import { DimensionScore } from "@/lib/types";

export function DimensionScoreRow({
  dimension,
  index,
}: {
  dimension: DimensionScore;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.15 + index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="border-b border-border py-6 last:border-b-0"
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-serif text-lg text-text-primary">
          {dimension.label}
        </h3>
        <span className="font-mono text-sm text-text-secondary">
          {dimension.score}/100
        </span>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${dimension.score}%` }}
          transition={{
            duration: 0.8,
            delay: 0.25 + index * 0.08,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="h-full rounded-full bg-accent"
        />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-text-secondary">
        {dimension.reasoning}
      </p>
    </motion.div>
  );
}
