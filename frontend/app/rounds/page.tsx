"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Round } from "@/lib/types";
import { readContract } from "@/lib/genlayer";
import { useContractRead } from "@/lib/use-contract-read";
import { RoundCard } from "@/components/round/RoundCard";
import { LoadingState, ErrorState } from "@/components/ui/AsyncState";

export default function RoundsPage() {
  const { data: rounds, loading, error } = useContractRead<Round[]>(
    "list_rounds",
    [],
  );
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!rounds) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        rounds.map(async (round) => {
          try {
            const raw = await readContract<string>("list_projects", [round.id]);
            const projects = typeof raw === "string" ? JSON.parse(raw) : raw;
            return [round.id, Array.isArray(projects) ? projects.length : 0] as const;
          } catch {
            return [round.id, 0] as const;
          }
        }),
      );
      if (!cancelled) setCounts(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [rounds]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-14 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-serif text-4xl text-text-primary">Rounds</h1>
          <p className="mt-3 max-w-xl text-text-secondary">
            Active and past impact evaluation rounds. Each round defines its
            own criteria and weighted dimensions.
          </p>
        </div>

        <Link
          href="/rounds/new"
          className="flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Round
        </Link>
      </div>

      {loading && <LoadingState label="Loading rounds..." />}
      {error && <ErrorState message={error} />}

      {rounds && rounds.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-6 py-28 text-center"
        >
          <h2 className="font-serif text-3xl text-text-primary">
            No rounds yet
          </h2>
          <p className="max-w-sm text-text-secondary">
            Every evaluation starts with a round: its criteria, its weighted
            dimensions, and the standard every submission is judged against.
          </p>
          <Link
            href="/rounds/new"
            className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90"
          >
            Create the first round
          </Link>
          <p className="text-xs text-text-secondary">
            Takes about a minute. You can add more admins later.
          </p>
        </motion.div>
      )}

      {rounds && rounds.length > 0 && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {rounds.map((round) => (
            <RoundCard
              key={round.id}
              round={round}
              submissionCount={counts[round.id] ?? null}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
