"use client";

import { Trash2 } from "lucide-react";
import { DraftDimension } from "@/lib/types";

export function DimensionRow({
  dimension,
  onChange,
  onRemove,
  removable,
}: {
  dimension: DraftDimension;
  onChange: (dimension: DraftDimension) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3">
      <input
        value={dimension.label}
        onChange={(e) => onChange({ ...dimension, label: e.target.value })}
        placeholder="Dimension label"
        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
      />

      <input
        type="range"
        min={0}
        max={100}
        value={dimension.weight}
        onChange={(e) =>
          onChange({ ...dimension, weight: Number(e.target.value) })
        }
        className="h-1 w-32 cursor-pointer appearance-none rounded-full bg-border accent-accent"
      />

      <span className="w-12 text-right font-mono text-sm text-text-secondary">
        {dimension.weight}%
      </span>

      <button
        type="button"
        onClick={onRemove}
        disabled={!removable}
        className="text-text-secondary transition-colors duration-300 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
