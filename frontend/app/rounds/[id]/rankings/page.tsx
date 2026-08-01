"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Evaluation, Payout, Project, Round } from "@/lib/types";
import { isContractConfigured, readContract, writeContract } from "@/lib/genlayer";
import { useContractRead } from "@/lib/use-contract-read";
import { useWallet } from "@/components/providers/WalletProvider";
import { RankingRow } from "@/components/round/RankingRow";
import { PayoutRow } from "@/components/round/PayoutRow";
import { LoadingState, ErrorState } from "@/components/ui/AsyncState";

export default function RankingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { address, provider, connect, error: walletError } = useWallet();

  const { data: round, loading: roundLoading, error: roundError } =
    useContractRead<Round>("get_round", [id], [id]);
  const { data: projects, loading: projectsLoading, error: projectsError } =
    useContractRead<Project[]>("list_projects", [id], [id]);
  const { data: payouts, refetch: refetchPayouts } =
    useContractRead<Payout[]>("list_payouts", [id], [id]);

  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [evaluationsLoading, setEvaluationsLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const fetchEvaluations = useCallback(async () => {
    if (!projects || !isContractConfigured()) {
      setEvaluationsLoading(false);
      return;
    }

    setEvaluationsLoading(true);
    const entries: Record<string, Evaluation> = {};
    await Promise.all(
      projects.map(async (project) => {
        try {
          const raw = await readContract<string>("get_evaluation", [project.id]);
          entries[project.id] = (
            typeof raw === "string" ? JSON.parse(raw) : raw
          ) as Evaluation;
        } catch {
          // no evaluation yet for this project, expected, not an error
        }
      }),
    );
    setEvaluations(entries);
    setEvaluationsLoading(false);
  }, [projects]);

  useEffect(() => {
    // Intentional fetch-on-mount/dependency-change; fetchEvaluations sets its
    // own loading state, it isn't deriving state from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvaluations();
  }, [fetchEvaluations]);

  async function handleRunEvaluation(projectId: string) {
    setRunError(null);
    if (!address) {
      setRunError("Connect your wallet to run an evaluation.");
      return;
    }

    setRunningId(projectId);
    try {
      await writeContract(address, provider, "evaluate_project", [
        projectId,
      ]);
      await fetchEvaluations();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Evaluation failed to run");
    } finally {
      setRunningId(null);
    }
  }

  if (roundLoading) return <LoadingState label="Loading round..." />;
  if (roundError)
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <ErrorState message={roundError} />
      </div>
    );
  if (!round) return null;

  const ranked = (projects ?? [])
    .filter((p) => evaluations[p.id])
    .map((project) => ({ project, evaluation: evaluations[project.id] }))
    .sort((a, b) => b.evaluation.overall_score - a.evaluation.overall_score);

  const pending = (projects ?? []).filter((p) => !evaluations[p.id]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <Link
        href={`/rounds/${round.id}`}
        className="flex w-fit items-center gap-2 text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {round.title}
      </Link>

      <h1 className="mt-6 font-serif text-4xl text-text-primary">Rankings</h1>
      <p className="mt-3 max-w-xl text-text-secondary">
        Evaluated submissions for this round, ranked by overall score.
      </p>

      {(projectsLoading || evaluationsLoading) && (
        <LoadingState label="Loading submissions..." />
      )}
      {projectsError && (
        <div className="mt-8">
          <ErrorState message={projectsError} />
        </div>
      )}

      {!projectsLoading &&
        !evaluationsLoading &&
        ranked.length === 0 &&
        pending.length === 0 && (
          <div className="flex flex-col items-center gap-5 py-24 text-center">
            <h2 className="font-serif text-2xl text-text-primary">
              Nothing submitted yet
            </h2>
            <p className="max-w-sm text-sm text-text-secondary">
              Once a project is submitted to this round, it will appear here
              once evaluated.
            </p>
            <Link
              href={`/submit?round=${round.id}`}
              className="rounded-full border border-border px-5 py-2.5 text-sm text-text-primary transition-colors duration-450 hover:border-accent/40"
            >
              Submit a project
            </Link>
          </div>
        )}

      {!evaluationsLoading && ranked.length > 0 && (
        <div className="mt-10 flex flex-col gap-3">
          {ranked.map(({ project, evaluation }, index) => (
            <RankingRow
              key={project.id}
              rank={index + 1}
              project={project}
              evaluation={evaluation}
              roundId={round.id}
              index={index}
            />
          ))}
        </div>
      )}

      {round.distributed && payouts && payouts.length > 0 && (
        <div className="mt-12">
          <h2 className="font-serif text-xl text-text-primary">
            Distribution
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            The funding pool has been split proportionally by final score,
            and each entitlement is recorded on-chain. Actual GEN settlement
            is currently handled off-chain by the round admin, who marks an
            entitlement paid once sent, due to a known GenLayer Bradbury
            limitation on contract-initiated transfers.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {payouts
              .filter((p) => Number(p.payout) > 0)
              .sort((a, b) => Number(b.payout) - Number(a.payout))
              .map((payout) => (
                <PayoutRow
                  key={payout.project_id}
                  payout={payout}
                  round={round}
                  onChanged={refetchPayouts}
                />
              ))}
          </div>
        </div>
      )}

      {!evaluationsLoading && pending.length > 0 && (
        <div className="mt-12">
          <h2 className="font-serif text-xl text-text-primary">
            Awaiting Evaluation
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {pending.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4"
              >
                <div className="min-w-0">
                  <h3 className="truncate font-serif text-lg text-text-primary">
                    {project.name}
                  </h3>
                  <p className="truncate text-sm text-text-secondary">
                    {project.description}
                  </p>
                </div>

                {!address ? (
                  <button
                    onClick={connect}
                    className="shrink-0 rounded-full border border-border bg-surface-elevated px-4 py-2 text-sm text-text-primary transition-colors duration-300 hover:border-accent/40"
                  >
                    Connect Wallet
                  </button>
                ) : (
                  <button
                    onClick={() => handleRunEvaluation(project.id)}
                    disabled={runningId === project.id}
                    className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                  >
                    {runningId === project.id ? "Evaluating..." : "Run Evaluation"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(runError || walletError) && (
        <div className="mt-6">
          <ErrorState message={runError || walletError || ""} />
        </div>
      )}
    </div>
  );
}
