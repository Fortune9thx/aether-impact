"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { mockRounds } from "@/lib/mock-data";
import { RoundCard } from "@/components/round/RoundCard";

export default function RoundsPage() {
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

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {mockRounds.map((round) => (
          <RoundCard key={round.id} round={round} />
        ))}
      </motion.div>
    </div>
  );
}
