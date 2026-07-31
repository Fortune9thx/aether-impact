"use client";

import { Trash2, Link2 } from "lucide-react";
import { DraftEvidenceLink } from "@/lib/types";

export function EvidenceRow({
  evidence,
  onChange,
  onRemove,
  removable,
}: {
  evidence: DraftEvidenceLink;
  onChange: (evidence: DraftEvidenceLink) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <Link2 className="h-4 w-4 shrink-0 text-text-secondary" />

      <input
        value={evidence.label}
        onChange={(e) => onChange({ ...evidence, label: e.target.value })}
        placeholder="Label (e.g. GitHub repo)"
        className="w-40 shrink-0 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
      />

      <input
        type="url"
        value={evidence.url}
        onChange={(e) => onChange({ ...evidence, url: e.target.value })}
        placeholder="https://..."
        className="flex-1 bg-transparent font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
      />

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
