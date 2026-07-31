"use client";

import { use } from "react";
import Link from "next/link";
import { Project, Round } from "@/lib/types";
import { useContractRead } from "@/lib/use-contract-read";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState } from "@/components/ui/AsyncState";

export default function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: round, loading: roundLoading, error: roundError } =
    useContractRead<Round>("get_round", [id], [id]);
  const { data: projects, loading: projectsLoading } = useContractRead<
    Project[]
  >("list_projects", [id], [id]);

  if (roundLoading) return <LoadingState label="Loading round..." />;
  if (roundError)
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <ErrorState message={roundError} />
      </div>
    );
  if (!round) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <div className="flex items-center justify-between">
        <StatusBadge status={round.status} />
        {round.status === "open" && (
          <Link
            href={`/submit?round=${round.id}`}
            className="rounded-full border border-border px-5 py-2 text-sm text-text-primary transition-colors duration-450 hover:border-accent/40"
          >
            Submit a Project
          </Link>
        )}
      </div>

      <h1 className="mt-6 font-serif text-4xl leading-tight text-text-primary">
        {round.title}
      </h1>
      <p className="mt-4 max-w-2xl text-text-secondary">
        {round.description}
      </p>

      <div className="mt-12 rounded-2xl border border-border bg-surface p-7">
        <h2 className="font-serif text-lg text-text-primary">
          Evaluation Criteria
        </h2>
        <p className="mt-3 font-mono text-sm leading-relaxed text-text-secondary">
          {round.criteria}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-7">
        <h2 className="font-serif text-lg text-text-primary">
          Weighted Dimensions
        </h2>
        <div className="mt-5 flex flex-col gap-4">
          {round.dimensions.map((dimension) => (
            <div key={dimension.label} className="flex items-center gap-4">
              <span className="w-40 shrink-0 text-sm text-text-primary">
                {dimension.label}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${dimension.weight}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono text-xs text-text-secondary">
                {dimension.weight}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 flex items-center justify-between border-t border-border pt-8 text-sm text-text-secondary">
        <span>
          {projectsLoading
            ? "loading submissions..."
            : `${projects?.length ?? 0} submissions so far`}
        </span>
        <span className="font-mono">opened {round.created_at}</span>
      </div>

      <Link
        href={`/rounds/${round.id}/rankings`}
        className="mt-6 flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm text-text-primary transition-colors duration-450 hover:border-accent/40"
      >
        View Rankings
      </Link>
    </div>
  );
}
