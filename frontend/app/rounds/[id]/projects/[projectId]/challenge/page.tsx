"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus } from "lucide-react";
import { mockEvaluations, mockProjects, mockRounds } from "@/lib/mock-data";
import { EvidenceLink } from "@/lib/types";
import { EvidenceRow } from "@/components/round/EvidenceRow";
import { FormSection } from "@/components/ui/FormSection";
import { notFound } from "next/navigation";

let evidenceCounter = 0;
function newEvidence(): EvidenceLink {
  evidenceCounter += 1;
  return { id: `challenge-${evidenceCounter}`, label: "", url: "" };
}

export default function ChallengePage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id, projectId } = use(params);
  const router = useRouter();

  const round = mockRounds.find((r) => r.id === id);
  const project = mockProjects.find((p) => p.id === projectId);
  const evaluation = mockEvaluations.find((e) => e.projectId === projectId);

  if (!round || !project || !evaluation) notFound();

  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<EvidenceLink[]>([newEvidence()]);

  function updateEvidence(index: number, item: EvidenceLink) {
    setEvidence((prev) => prev.map((e, i) => (i === index ? item : e)));
  }

  function removeEvidence(index: number) {
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/rounds/${round.id}/projects/${project.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to evaluation
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6"
      >
        <h1 className="font-serif text-4xl text-text-primary">
          Challenge Evaluation
        </h1>
        <p className="mt-3 max-w-xl text-text-secondary">
          Dispute the evaluation of <span className="text-text-primary">{project.name}</span> by
          submitting new or overlooked evidence. The Intelligent Contract will
          re-evaluate with the full evidence set.
        </p>
      </motion.div>

      <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Current overall score</span>
          <span className="font-mono text-text-primary">
            {evaluation.overallScore}/100
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-text-secondary">Confidence</span>
          <span className="font-mono text-text-primary">
            {evaluation.confidence}/100
          </span>
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={handleSubmit}
        className="mt-10 flex flex-col gap-10"
      >
        <FormSection
          label="Reason for challenge"
          hint="Explain what the evaluation missed or got wrong."
        >
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. The evaluation understated adoption — it didn't account for our private enterprise integrations."
            className="resize-none rounded-xl border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary/60 focus:border-accent/40 focus:outline-none"
          />
        </FormSection>

        <FormSection
          label="New evidence"
          hint="Links that support your challenge and were not part of the original submission."
        >
          <div className="flex flex-col gap-3">
            {evidence.map((item, index) => (
              <EvidenceRow
                key={item.id}
                evidence={item}
                onChange={(e) => updateEvidence(index, e)}
                onRemove={() => removeEvidence(index)}
                removable={evidence.length > 1}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setEvidence((prev) => [...prev, newEvidence()])}
            className="flex w-fit items-center gap-2 text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
          >
            <Plus className="h-4 w-4" />
            Add evidence link
          </button>
        </FormSection>

        <div className="flex items-center gap-4 border-t border-border pt-8">
          <button
            type="submit"
            className="rounded-full bg-danger px-6 py-3 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90"
          >
            Submit Challenge
          </button>
          <button
            type="button"
            onClick={() => router.push(`/rounds/${round.id}/projects/${project.id}`)}
            className="text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </motion.form>
    </div>
  );
}
