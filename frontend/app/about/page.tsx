import type { Metadata } from "next";
import { CONTRACT_ADDRESS, activeChain } from "@/lib/genlayer";

export const metadata: Metadata = {
  title: "About | Aether Impact",
  description:
    "How Aether Impact's GenLayer Intelligent Contract evaluates retroactive impact funding.",
};

const steps = [
  {
    title: "Define Criteria",
    body: "A round is created with natural language evaluation criteria and weighted dimensions: no rigid rubric, just a clear statement of what matters.",
  },
  {
    title: "Submit Evidence",
    body: "Builders submit what they shipped, the impact they claim, and links to evidence: repos, usage data, case studies, anything verifiable.",
  },
  {
    title: "Intelligent Evaluation",
    body: "A GenLayer Intelligent Contract reads the criteria and evidence, reasons through it with an LLM, and reaches consensus across independent validators under the Equivalence Principle: not a single model's opinion, but agreement across a decentralized set of them.",
  },
  {
    title: "Challenge & Re-evaluate",
    body: "Every score ships with reasoning and cited sources. Disagree, and you can submit new evidence: the contract re-evaluates with the full picture, on-chain, permanently.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-serif text-4xl text-text-primary">
        Why Aether Impact
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
        Retroactive public goods funding, like Optimism&apos;s RetroPGF,
        proved that paying for impact after it happens beats guessing at
        grants beforehand. But it doesn&apos;t scale: badgeholders spend weeks
        manually reviewing hundreds of submissions, and every round starts
        from zero. Aether Impact replaces that bottleneck with a GenLayer
        Intelligent Contract that reads evidence, reasons transparently, and
        reaches verifiable consensus at the speed of a transaction, not a
        committee.
      </p>

      <div className="mt-16 flex flex-col gap-0">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="flex gap-6 border-b border-border py-8 last:border-b-0"
          >
            <span className="font-mono text-sm text-text-secondary">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 className="font-serif text-xl text-text-primary">
                {step.title}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-2xl border border-border bg-surface p-7">
        <h2 className="font-serif text-lg text-text-primary">
          On-chain, by design
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
          Every round, submission, evaluation, and challenge lives on
          GenLayer: nothing here is a database backing a UI. The contract
          itself is the decision-maker; this interface only reads and writes
          to it.
        </p>

        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6 font-mono text-xs text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>Network: {activeChain.name}</span>
          <span className="break-all">
            {CONTRACT_ADDRESS || "not yet configured"}
          </span>
        </div>
      </div>
    </div>
  );
}
