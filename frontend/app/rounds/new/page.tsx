"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Dimension } from "@/lib/types";
import { DimensionRow } from "@/components/round/DimensionRow";
import { FormSection } from "@/components/ui/FormSection";

let dimensionCounter = 0;
function newDimension(): Dimension {
  dimensionCounter += 1;
  return { id: `new-${dimensionCounter}`, label: "", weight: 25 };
}

export default function NewRoundPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState("");
  const [dimensions, setDimensions] = useState<Dimension[]>([
    newDimension(),
    newDimension(),
  ]);

  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);

  function updateDimension(index: number, dimension: Dimension) {
    setDimensions((prev) =>
      prev.map((d, i) => (i === index ? dimension : d)),
    );
  }

  function removeDimension(index: number) {
    setDimensions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/rounds");
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="font-serif text-4xl text-text-primary">New Round</h1>
        <p className="mt-3 text-text-secondary">
          Define natural language criteria and weighted dimensions. The
          Intelligent Contract will use these to evaluate every submission.
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={handleSubmit}
        className="mt-12 flex flex-col gap-10"
      >
        <FormSection label="Round title">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Public Goods Round — Q3 2026"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary/60 focus:border-accent/40 focus:outline-none"
          />
        </FormSection>

        <FormSection label="Description">
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is this round funding or recognizing?"
            className="resize-none rounded-xl border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary/60 focus:border-accent/40 focus:outline-none"
          />
        </FormSection>

        <FormSection
          label="Evaluation criteria"
          hint="Written in natural language — this is what the Intelligent Contract reads to judge submissions."
        >
          <textarea
            required
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            rows={5}
            placeholder="Prioritize projects with verifiable on-chain usage, sustained maintenance, and evidence of downstream adoption..."
            className="resize-none rounded-xl border border-border bg-surface px-4 py-3 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent/40 focus:outline-none"
          />
        </FormSection>

        <FormSection
          label="Weighted dimensions"
          hint="Break the criteria into scored dimensions. Weights should total 100%."
        >
          <div className="flex flex-col gap-3">
            {dimensions.map((dimension, index) => (
              <DimensionRow
                key={dimension.id}
                dimension={dimension}
                onChange={(d) => updateDimension(index, d)}
                onRemove={() => removeDimension(index)}
                removable={dimensions.length > 1}
              />
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setDimensions((prev) => [...prev, newDimension()])}
              className="flex items-center gap-2 text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
            >
              <Plus className="h-4 w-4" />
              Add dimension
            </button>

            <span
              className={`font-mono text-sm ${
                totalWeight === 100 ? "text-accent" : "text-danger"
              }`}
            >
              {totalWeight}% total
            </span>
          </div>
        </FormSection>

        <div className="flex items-center gap-4 border-t border-border pt-8">
          <button
            type="submit"
            disabled={totalWeight !== 100}
            className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Create Round
          </button>
          <button
            type="button"
            onClick={() => router.push("/rounds")}
            className="text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </motion.form>
    </div>
  );
}
