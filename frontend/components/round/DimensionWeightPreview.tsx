"use client";

import { motion } from "framer-motion";
import { DraftDimension } from "@/lib/types";

// A calm horizontal segmented bar showing each dimension's proportional
// weight, updating live as the user adjusts the sliders above.
export function DimensionWeightPreview({
  dimensions,
}: {
  dimensions: DraftDimension[];
}) {
  const total = dimensions.reduce((sum, d) => sum + d.weight, 0) || 1;

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-border">
      {dimensions.map((dimension, index) => (
        <motion.div
          key={dimension.key}
          animate={{ width: `${(dimension.weight / total) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{
            backgroundColor: "#6EE7B7",
            opacity: 1 - index * 0.18,
          }}
        />
      ))}
    </div>
  );
}
