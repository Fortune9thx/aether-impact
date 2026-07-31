"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Sparkles } from "lucide-react";
import { Evaluation, Project, Round } from "@/lib/types";
import { isContractConfigured, readContract, writeContract } from "@/lib/genlayer";
import { useWallet } from "@/components/providers/WalletProvider";
import { useContractRead } from "@/lib/use-contract-read";
import { ScoreReveal } from "@/components/evaluation/ScoreReveal";
import { DimensionScoreRow } from "@/components/evaluation/DimensionScoreRow";
import { CitedEvidenceList } from "@/components/evaluation/CitedEvidenceList";
import { LoadingState, ErrorState } from "@/components/ui/AsyncState";
import { WalletButton } from "@/components/ui/WalletButton";
import { formatGen } from "@/lib/format";

export default function EvaluationPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id, projectId } = use(params);
  const { address } = useWallet();

  const { data: round, loading: roundLoading, error: roundError } =
    useContractRead<Round>("get_round", [id], [id]);
  const { data: project, loading: projectLoading, error: projectError, refetch: refetchProject } =
    useContractRead<Project>("get_project", [projectId], [projectId]);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(true);
  const [evaluationMissing, setEvaluationMissing] = useState(false);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const fetchEvaluation = useCallback(async () => {
    if (!isContractConfigured()) {
      setEvaluationLoading(false);
      return;
    }
    setEvaluationLoading(true);
    setEvaluationMissing(false);
    try {
      const raw = await readContract<string>("get_evaluation", [projectId]);
      setEvaluation(typeof raw === "string" ? JSON.parse(raw) : raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.toLowerCase().includes("no evaluation found")) {
        setEvaluationMissing(true);
      } else {
        setRunError(message || "Failed to load evaluation");
      }
    } finally {
      setEvaluationLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // Intentional fetch-on-mount/dependency-change; fetchEvaluation sets its
    // own loading/error state, it isn't deriving state from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvaluation();
  }, [fetchEvaluation]);

  async function handleTriggerEvaluation() {
    setRunError(null);

    if (!address) {
      setRunError("Connect your wallet to trigger an evaluation.");
      return;
    }

    setRunning(true);
    try {
      await writeContract(address, window.ethereum, "evaluate_project", [
        projectId,
      ]);
      await fetchEvaluation();
    } catch (err) {
      setRunError(
        err instanceof Error ? err.message : "Evaluation failed to run",
      );
    } finally {
      setRunning(false);
    }
  }

  if (roundLoading || projectLoading) return <LoadingState label="Loading project..." />;

  const loadError = roundError || projectError;
  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <ErrorState message={loadError} />
      </div>
    );
  }

  if (!round || !project) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <Link
        href={`/rounds/${round.id}`}
        className="flex w-fit items-center gap-2 text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {round.title}
      </Link>

      <div className="mt-6">
        <h1 className="font-serif text-4xl leading-tight text-text-primary">
          {project.name}
        </h1>
        <p className="mt-3 max-w-2xl text-text-secondary">
          {project.description}
        </p>
      </div>

      {evaluation?.challenged && (
        <div className="mt-6 flex w-fit items-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          <AlertTriangle className="h-3.5 w-3.5" />
          Re-evaluated after challenge
        </div>
      )}

      {evaluationLoading && <LoadingState label="Checking evaluation status..." />}

      {!evaluationLoading && evaluationMissing && (
        <div className="mt-14 flex flex-col items-center gap-5 rounded-2xl border border-border bg-surface py-16 text-center">
          <Sparkles className="h-6 w-6 text-accent" />
          <div>
            <h2 className="font-serif text-2xl text-text-primary">
              Not evaluated yet
            </h2>
            <p className="mt-2 max-w-sm text-sm text-text-secondary">
              Trigger the Intelligent Contract to score this submission
              against the round&apos;s weighted dimensions.
            </p>
          </div>

          {!address ? (
            <WalletButton />
          ) : (
            <button
              onClick={handleTriggerEvaluation}
              disabled={running}
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {running ? "Evaluating (this can take a moment)..." : "Trigger Evaluation"}
            </button>
          )}

          {runError && (
            <div className="w-full max-w-md px-6">
              <ErrorState message={runError} />
            </div>
          )}
        </div>
      )}

      {!evaluationLoading && runError && !evaluationMissing && (
        <div className="mt-8">
          <ErrorState message={runError} />
        </div>
      )}

      {!evaluationLoading && evaluation && (
        <>
          <div className="mt-14 flex items-center justify-center gap-16 rounded-2xl border border-border bg-surface py-14">
            <ScoreReveal score={evaluation.overall_score} label="Overall Score" size="lg" />
            <div className="h-16 w-px bg-border" />
            <ScoreReveal score={evaluation.confidence} label="Confidence" size="sm" />
          </div>

          <div className="mt-14">
            <h2 className="font-serif text-2xl text-text-primary">Reasoning</h2>
            <p className="mt-4 font-serif text-lg leading-[1.8] text-text-primary/90">
              {evaluation.reasoning}
            </p>
          </div>

          <div className="mt-14">
            <h2 className="font-serif text-2xl text-text-primary">
              Dimension Breakdown
            </h2>
            <div className="mt-4">
              {evaluation.dimension_scores.map((dimension, index) => (
                <DimensionScoreRow
                  key={dimension.label}
                  dimension={dimension}
                  index={index}
                />
              ))}
            </div>
          </div>

          <div className="mt-14">
            <h2 className="font-serif text-2xl text-text-primary">
              Cited Evidence
            </h2>
            <div className="mt-4">
              <CitedEvidenceList urls={evaluation.cited_evidence} />
            </div>
          </div>

          {round.distributed && Number(project.payout) > 0 && (
            <div className="mt-14 flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-7">
              <div>
                <h2 className="font-serif text-lg text-text-primary">
                  Payout
                </h2>
                <p className="mt-1 font-mono text-sm text-accent">
                  {formatGen(project.payout)} GEN
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Recording a claim confirms your entitlement on-chain; fund
                  settlement is currently handled off-chain.
                </p>
              </div>

              {project.claimed ? (
                <span className="text-sm text-text-secondary">Claim recorded</span>
              ) : address?.toLowerCase() === project.submitter.toLowerCase() ? (
                <button
                  onClick={async () => {
                    setClaimError(null);
                    if (!address) return;
                    setClaiming(true);
                    try {
                      await writeContract(address, window.ethereum, "claim_payout", [
                        project.id,
                      ]);
                      await refetchProject();
                    } catch (err) {
                      setClaimError(
                        err instanceof Error ? err.message : "Failed to claim payout",
                      );
                    } finally {
                      setClaiming(false);
                    }
                  }}
                  disabled={claiming}
                  className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                >
                  {claiming ? "Recording..." : "Record Claim"}
                </button>
              ) : (
                <span className="text-sm text-text-secondary">
                  Only the submitter can claim
                </span>
              )}
            </div>
          )}
          {claimError && (
            <div className="mt-4">
              <ErrorState message={claimError} />
            </div>
          )}

          <div className="mt-16 flex items-center justify-between border-t border-border pt-8">
            {round.distributed ? (
              <p className="text-sm text-text-secondary">
                This round has distributed funds; evaluations can no longer be
                challenged.
              </p>
            ) : (
              <>
                <p className="max-w-sm text-sm text-text-secondary">
                  Disagree with this evaluation? Submit a challenge with new
                  supporting evidence.
                </p>
                <Link
                  href={`/rounds/${round.id}/projects/${project.id}/challenge`}
                  className="shrink-0 rounded-full border border-border px-5 py-2.5 text-sm text-text-primary transition-colors duration-450 hover:border-danger/40"
                >
                  Challenge Evaluation
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
