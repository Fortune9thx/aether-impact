import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col px-6">
      <section className="flex flex-col items-start gap-8 py-32">
        <span className="rounded-full border border-border bg-surface px-4 py-1.5 text-xs uppercase tracking-widest text-text-secondary">
          Retroactive Impact, Evaluated
        </span>

        <h1 className="max-w-3xl font-serif text-5xl font-normal leading-[1.1] text-text-primary sm:text-6xl">
          Scalable, transparent evaluation for public goods funding.
        </h1>

        <p className="max-w-xl text-lg leading-relaxed text-text-secondary">
          Aether Impact replaces slow human badgeholder review with GenLayer
          Intelligent Contracts — structured scores, cited reasoning, and
          confidence, at scale.
        </p>

        <div className="flex items-center gap-4 pt-4">
          <Link
            href="/rounds"
            className="group flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-all duration-450 hover:opacity-90"
          >
            View Rounds
            <ArrowRight className="h-4 w-4 transition-transform duration-450 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/submit"
            className="rounded-full border border-border px-6 py-3 text-sm text-text-primary transition-colors duration-450 hover:border-accent/40"
          >
            Submit a Project
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border sm:grid-cols-3">
        {[
          {
            title: "Define Criteria",
            body: "Set natural language evaluation criteria and weighted dimensions for a funding round.",
          },
          {
            title: "AI Evaluation",
            body: "Intelligent Contracts read submissions, verify evidence against live web data, and reach consensus.",
          },
          {
            title: "Challenge & Verify",
            body: "Every score ships with reasoning and citations — and can be challenged with new evidence.",
          },
        ].map((item) => (
          <div key={item.title} className="bg-surface p-8">
            <h3 className="mb-3 font-serif text-xl text-text-primary">
              {item.title}
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary">
              {item.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
