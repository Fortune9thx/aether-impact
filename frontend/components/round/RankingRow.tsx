"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Evaluation, Project } from "@/lib/types";

export function RankingRow({
  rank,
  project,
  evaluation,
  roundId,
  index,
}: {
  rank: number;
  project: Project;
  evaluation: Evaluation;
  roundId: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/rounds/${roundId}/projects/${project.id}`}
        className="group grid grid-cols-[2rem_1fr_auto] items-center gap-4 rounded-xl border border-border bg-surface px-4 py-4 transition-colors duration-450 hover:border-accent/30 hover:bg-surface-elevated sm:grid-cols-[2.5rem_1fr_auto_auto] sm:gap-6 sm:px-5"
      >
        <span className="font-mono text-sm text-text-secondary">
          {String(rank).padStart(2, "0")}
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-serif text-lg text-text-primary">
              {project.name}
            </h3>
            {evaluation.challenged && (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />
            )}
          </div>
          <p className="truncate text-sm text-text-secondary">
            {project.description}
          </p>
        </div>

        <div className="hidden flex-col items-end sm:flex">
          <span className="font-mono text-sm text-text-secondary">
            confidence
          </span>
          <span className="font-mono text-sm text-text-primary">
            {evaluation.confidence}%
          </span>
        </div>

        <span className="font-serif text-2xl text-accent sm:text-3xl">
          {evaluation.overallScore}
        </span>
      </Link>
    </motion.div>
  );
}
