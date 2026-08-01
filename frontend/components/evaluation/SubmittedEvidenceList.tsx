"use client";

import { ExternalLink } from "lucide-react";
import { EvidenceLink } from "@/lib/types";

function truncate(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function SubmittedEvidenceList({
  evidence,
  submitter,
}: {
  evidence: EvidenceLink[];
  submitter: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {evidence.map((item, index) => {
        const isChallenge =
          !!item.submitted_by && item.submitted_by.toLowerCase() !== submitter.toLowerCase();
        return (
          <a
            key={`${item.url}-${index}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors duration-450 hover:border-accent/30 hover:bg-surface-elevated"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm text-text-primary">{item.label}</span>
                {isChallenge && (
                  <span className="shrink-0 rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 font-mono text-[10px] text-danger">
                    challenge, by {truncate(item.submitted_by!)}
                  </span>
                )}
              </div>
              <span className="truncate font-mono text-xs text-text-secondary group-hover:text-text-primary/80">
                {item.url}
              </span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-secondary group-hover:text-accent" />
          </a>
        );
      })}
    </div>
  );
}
