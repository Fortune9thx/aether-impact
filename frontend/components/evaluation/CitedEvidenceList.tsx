"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

export function CitedEvidenceList({ urls }: { urls: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-2"
    >
      {urls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors duration-450 hover:border-accent/30 hover:bg-surface-elevated"
        >
          <span className="truncate font-mono text-sm text-text-secondary group-hover:text-text-primary">
            {url}
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-secondary group-hover:text-accent" />
        </a>
      ))}
    </motion.div>
  );
}
