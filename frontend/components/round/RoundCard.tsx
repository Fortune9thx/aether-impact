"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Round } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function RoundCard({ round }: { round: Round }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/rounds/${round.id}`}
        className="group flex flex-col gap-5 rounded-2xl border border-border bg-surface p-7 transition-colors duration-450 hover:border-accent/30 hover:bg-surface-elevated"
      >
        <div className="flex items-start justify-between gap-4">
          <StatusBadge status={round.status} />
          <ArrowUpRight className="h-4 w-4 text-text-secondary transition-all duration-450 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
        </div>

        <div>
          <h3 className="font-serif text-2xl leading-snug text-text-primary">
            {round.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-secondary">
            {round.description}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4 font-mono text-xs text-text-secondary">
          <span>{round.submissionCount} submissions</span>
          <span>{round.dimensions.length} dimensions</span>
        </div>
      </Link>
    </motion.div>
  );
}
