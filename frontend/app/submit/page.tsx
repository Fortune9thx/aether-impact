"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { EvidenceLink } from "@/lib/types";
import { mockRounds } from "@/lib/mock-data";
import { EvidenceRow } from "@/components/round/EvidenceRow";
import { FormSection } from "@/components/ui/FormSection";

let evidenceCounter = 0;
function newEvidence(): EvidenceLink {
  evidenceCounter += 1;
  return { id: `new-${evidenceCounter}`, label: "", url: "" };
}

function SubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRound = searchParams.get("round") ?? mockRounds[0]?.id ?? "";

  const [roundId, setRoundId] = useState(preselectedRound);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [claimedImpact, setClaimedImpact] = useState("");
  const [evidence, setEvidence] = useState<EvidenceLink[]>([
    newEvidence(),
  ]);

  const openRounds = mockRounds.filter((r) => r.status !== "closed");

  function updateEvidence(index: number, item: EvidenceLink) {
    setEvidence((prev) => prev.map((e, i) => (i === index ? item : e)));
  }

  function removeEvidence(index: number) {
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/rounds/${roundId}`);
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
            onChange={(e) => setRoundId(e.target.value)}
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
          hint="Links to repos, dashboards, usage data, or anything else that substantiates your claim."
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
            className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90"
          >
            Submit for Evaluation
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

export default function SubmitPage() {
  return (
    <Suspense>
      <SubmitForm />
    </Suspense>
  );
}
