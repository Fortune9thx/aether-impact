"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { DraftEvidenceLink, Round } from "@/lib/types";
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
  return { key: `new-${evidenceCounter}`, label: "", url: "" };
}

function SubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useWallet();

  const { data: rounds, loading: roundsLoading, error: roundsError } =
    useContractRead<Round[]>("list_rounds", []);
  const openRounds = (rounds ?? []).filter((r) => r.status === "open");

  const [selectedRoundId, setSelectedRoundId] = useState(searchParams.get("round") ?? "");
  const roundId = selectedRoundId || openRounds[0]?.id || "";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [claimedImpact, setClaimedImpact] = useState("");
  const [evidence, setEvidence] = useState<DraftEvidenceLink[]>([
    newEvidence(),
  ]);
  const [submitting, setSubmitting] = useState(false);
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
      setError("Connect your wallet before submitting a project.");
      return;
    }
    if (!roundId) {
      setError("Select a round to submit to.");
      return;
    }

    setSubmitting(true);
    try {
      const evidencePayload = evidence.map(({ label, url }) => ({ label, url }));

      await writeContract(address, window.ethereum, "submit_project", [
        roundId,
        name,
        description,
        claimedImpact,
        JSON.stringify(evidencePayload),
      ]);

      router.push(`/rounds/${roundId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="font-serif text-4xl text-text-primary">
          Submit a Project
        </h1>
        <p className="mt-3 text-text-secondary">
          Describe what you built, the impact you claim it had, and the
          evidence that supports it. This is what the Intelligent Contract
          will evaluate.
        </p>
      </motion.div>

      {!address && (
        <div className="mt-8 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4">
          <p className="text-sm text-text-secondary">
            You need a connected wallet to submit a project.
          </p>
          <WalletButton />
        </div>
      )}

      {roundsLoading && <LoadingState label="Loading rounds..." />}
      {roundsError && (
        <div className="mt-8">
          <ErrorState message={roundsError} />
        </div>
      )}

      {rounds && openRounds.length === 0 && (
        <p className="mt-8 text-text-secondary">
          No rounds are currently open for submissions.
        </p>
      )}

      {openRounds.length > 0 && (
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={handleSubmit}
          className="mt-12 flex flex-col gap-10"
        >
          <FormSection label="Round">
            <select
              required
              value={roundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-text-primary focus:border-accent/40 focus:outline-none"
            >
              {openRounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {round.title}
                </option>
              ))}
            </select>
          </FormSection>

          <FormSection label="Project name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cartographer SDK"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary/60 focus:border-accent/40 focus:outline-none"
            />
          </FormSection>

          <FormSection label="What did you build?">
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the project, its purpose, and how it works."
              className="resize-none rounded-xl border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary/60 focus:border-accent/40 focus:outline-none"
            />
          </FormSection>

          <FormSection
            label="Claimed impact"
            hint="Be specific — this is the claim the Intelligent Contract will verify against your evidence."
          >
            <textarea
              required
              value={claimedImpact}
              onChange={(e) => setClaimedImpact(e.target.value)}
              rows={4}
              placeholder="e.g. Adopted by 40+ downstream projects, reducing integration time from days to hours."
              className="resize-none rounded-xl border border-border bg-surface px-4 py-3 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent/40 focus:outline-none"
            />
          </FormSection>

          <FormSection
            label="Evidence"
            hint="Links to repos, dashboards, usage data, or anything else that substantiates your claim. Must be http(s) URLs."
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
              className="flex w-fit items-center gap-2 text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
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
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Submitting..." : "Submit for Evaluation"}
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
      )}
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense>
      <SubmitForm />
    </Suspense>
  );
}
