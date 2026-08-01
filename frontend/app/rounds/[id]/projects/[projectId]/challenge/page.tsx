"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus } from "lucide-react";
import { DraftEvidenceLink, Evaluation, Project } from "@/lib/types";
import { writeContract } from "@/lib/genlayer";
import { useContractRead } from "@/lib/use-contract-read";
import { useWallet } from "@/components/providers/WalletProvider";
import { EvidenceRow } from "@/components/round/EvidenceRow";
import { FormSection } from "@/components/ui/FormSection";
import { LoadingState, ErrorState } from "@/components/ui/AsyncState";
import { WalletButton } from "@/components/ui/WalletButton";

let evidenceCounter = 0;
function newEvidence(): DraftEvidenceLink {
  evidenceCounter += 1;
  return { key: `challenge-${evidenceCounter}`, label: "", url: "" };
}

export default function ChallengePage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id, projectId } = use(params);
  const router = useRouter();
  const { address, provider } = useWallet();

  const { data: project, loading: projectLoading, error: projectError } =
    useContractRead<Project>("get_project", [projectId], [projectId]);
  const { data: evaluation, loading: evaluationLoading, error: evaluationError } =
    useContractRead<Evaluation>("get_evaluation", [projectId], [projectId]);

  const [evidence, setEvidence] = useState<DraftEvidenceLink[]>([newEvidence()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateEvidence(index: number, item: DraftEvidenceLink) {
    setEvidence((prev) => prev.map((e, i) => (i === index ? item : e)));
  }

  function removeEvidence(index: number) {
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!address) {
      setError("Connect your wallet to submit a challenge.");
      return;
    }

    setSubmitting(true);
    setSubmitStatus(null);
    try {
      const evidencePayload = evidence.map(({ label, url }) => ({ label, url }));

      await writeContract(
        address,
        provider,
        "challenge_evaluation",
        [projectId, JSON.stringify(evidencePayload)],
        BigInt(0),
        setSubmitStatus,
      );

      router.push(`/rounds/${id}/projects/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit challenge");
    } finally {
      setSubmitting(false);
      setSubmitStatus(null);
    }
  }

  if (projectLoading || evaluationLoading)
    return <LoadingState label="Loading evaluation..." />;

  const loadError = projectError || evaluationError;
  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <ErrorState message={loadError} />
      </div>
    );
  }

  if (!project || !evaluation) return null;

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
            {evaluation.overall_score}/100
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-text-secondary">Confidence</span>
          <span className="font-mono text-text-primary">
            {evaluation.confidence}/100
          </span>
        </div>
      </div>

      {!address && (
        <div className="mt-8 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4">
          <p className="text-sm text-text-secondary">
            You need a connected wallet to submit a challenge.
          </p>
          <WalletButton />
        </div>
      )}

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={handleSubmit}
        className="mt-10 flex flex-col gap-14"
      >
        <FormSection
          label="New evidence"
          hint="Links that support your challenge and were not part of the original submission. Must be http(s) URLs."
        >
          <div className="flex flex-col gap-3">
            {evidence.map((item, index) => (
              <EvidenceRow
                key={item.key}
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
            disabled={evidence.length >= 20}
            className="flex w-fit items-center gap-2 text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Plus className="h-4 w-4" />
            Add evidence link
          </button>
        </FormSection>

        {error && <ErrorState message={error} />}

        <div className="flex items-center gap-4 border-t border-border pt-8">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-danger px-6 py-3 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? submitStatus ?? "Re-evaluating..." : "Submit Challenge"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/rounds/${id}/projects/${projectId}`)}
            className="text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </motion.form>
    </div>
  );
}
