"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Sparkles } from "lucide-react";
import { Evaluation, isRoundAdmin, Project, Round } from "@/lib/types";
import { isContractConfigured, readContract, writeContract } from "@/lib/genlayer";
import { useWallet } from "@/components/providers/WalletProvider";
import { useContractRead } from "@/lib/use-contract-read";
import { ScoreHero } from "@/components/evaluation/ScoreHero";
import { DimensionScoreRow } from "@/components/evaluation/DimensionScoreRow";
import { CitedEvidenceList } from "@/components/evaluation/CitedEvidenceList";
import { SubmittedEvidenceList } from "@/components/evaluation/SubmittedEvidenceList";
import { LoadingState, ErrorState } from "@/components/ui/AsyncState";
import { WalletButton } from "@/components/ui/WalletButton";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";
import { formatGen, formatDate } from "@/lib/format";

export default function EvaluationPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id, projectId } = use(params);
  const { address, provider } = useWallet();

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
  const [runStatus, setRunStatus] = useState<string | null>(null);

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
    setRunStatus(null);
    try {
      await writeContract(
        address,
        provider,
        "evaluate_project",
        [projectId],
        BigInt(0),
        setRunStatus,
      );
      await fetchEvaluation();
    } catch (err) {
      setRunError(
        err instanceof Error ? err.message : "Evaluation failed to run",
      );
    } finally {
      setRunning(false);
      setRunStatus(null);
    }
  }

  if (roundLoading || projectLoading) return <LoadingState label="Loading project..." />;

  const loadError = roundError || projectError;
  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        <ErrorState message={loadError} />
      </div>
    );
  }

  if (!round || !project) return null;

  const weightByLabel = new Map(round.dimensions.map((d) => [d.label, d.weight]));

  return (
    <div className="mx-auto max-w-2xl px-6 pb-32 pt-16 sm:pt-20">
      <Link
        href={`/rounds/${round.id}`}
        className="flex w-fit items-center gap-2 text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {round.title}
      </Link>

      {/* Project header */}
      <div className="mt-10">
        <span className="text-xs uppercase tracking-[0.2em] text-text-secondary">
          Evaluation
        </span>
        <h1 className="mt-3 font-serif text-4xl leading-[1.1] text-text-primary sm:text-5xl">
          {project.name}
        </h1>
        <p className="mt-4 text-sm text-text-secondary">
          {round.title} &middot; {formatDate(project.submitted_at)} &middot;{" "}
          {round.status === "open" ? "Open" : "Closed"}
        </p>
        <p className="mt-6 max-w-[65ch] text-text-secondary">
          {project.description}
        </p>
      </div>

      {evaluation?.challenged && (
        <div className="mt-8 flex w-fit items-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          <AlertTriangle className="h-3.5 w-3.5" />
          Re-evaluated after challenge
          {evaluation.challenged_by && (
            <span className="font-mono text-xs text-danger/80">
              by {evaluation.challenged_by.slice(0, 6)}...{evaluation.challenged_by.slice(-4)}
            </span>
          )}
        </div>
      )}

      {evaluationLoading && <LoadingState label="Checking evaluation status..." />}

      {!evaluationLoading && evaluationMissing && (
        <div className="mt-16 flex flex-col items-center gap-5 py-20 text-center">
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
              {running
                ? runStatus ?? "Evaluating (this can take a moment)..."
                : "Trigger Evaluation"}
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
          {/* Score hero */}
          <ScoreHero score={evaluation.overall_score} confidence={evaluation.confidence} />

          {/* Dimension scores */}
          <div className="mt-8">
            <h2 className="font-serif text-2xl text-text-primary">
              Dimension Breakdown
            </h2>
            <div className="mt-2">
              {evaluation.dimension_scores.map((dimension, index) => (
                <DimensionScoreRow
                  key={dimension.label}
                  dimension={dimension}
                  weight={weightByLabel.get(dimension.label)}
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* Reasoning -- the most important content on the page */}
          <div className="mt-20">
            <h2 className="font-serif text-2xl text-text-primary">Reasoning</h2>
            <p className="mt-5 max-w-[68ch] font-serif text-lg leading-[1.85] text-text-primary/90">
              {evaluation.reasoning}
            </p>
          </div>

          {/* Cited evidence */}
          <div className="mt-20">
            <h2 className="font-serif text-2xl text-text-primary">
              Cited Evidence
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              The links the Intelligent Contract cited in its reasoning above.
            </p>
            <div className="mt-5">
              <CitedEvidenceList urls={evaluation.cited_evidence} />
            </div>
          </div>

          {/* Full submitted evidence, with attribution */}
          <div className="mt-16">
            <h2 className="font-serif text-xl text-text-primary">
              Submitted Evidence
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              Every link attached to this project, including any added later
              via a challenge, attributed to whoever submitted it.
            </p>
            <div className="mt-5">
              <SubmittedEvidenceList evidence={project.evidence} submitter={project.submitter} />
            </div>
          </div>

          {round.distributed && Number(project.payout) > 0 && (
            <div className="mt-16 flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-7">
              <div>
                <h2 className="font-serif text-lg text-text-primary">
                  Payout
                </h2>
                <p className="mt-1 font-mono text-sm text-accent">
                  {formatGen(project.payout)} GEN
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  This entitlement is recorded on-chain. Actual GEN
                  settlement is currently handled off-chain by the round
                  admin, who marks it paid via <code>mark_paid</code> once
                  sent, due to a known GenLayer Bradbury limitation on
                  contract-initiated transfers.
                </p>
              </div>

              {project.paid ? (
                <span className="text-sm text-text-secondary">Paid</span>
              ) : round && isRoundAdmin(round, address) ? (
                <button
                  onClick={async () => {
                    setClaimError(null);
                    if (!address) return;
                    setClaiming(true);
                    try {
                      await writeContract(address, provider, "mark_paid", [
                        project.id,
                      ]);
                      await refetchProject();
                    } catch (err) {
                      setClaimError(
                        err instanceof Error ? err.message : "Failed to mark as paid",
                      );
                    } finally {
                      setClaiming(false);
                    }
                  }}
                  disabled={claiming}
                  className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                >
                  {claiming ? "Marking..." : "Mark Paid"}
                </button>
              ) : (
                <span className="text-sm text-text-secondary">
                  Awaiting payout
                </span>
              )}
            </div>
          )}
          {claimError && (
            <div className="mt-4">
              <ErrorState message={claimError} />
            </div>
          )}

          {/* Actions */}
          <div className="mt-20 flex items-center justify-between gap-4 border-t border-border pt-8">
            {round.distributed ? (
              <p className="text-sm text-text-secondary">
                This round has distributed funds; evaluations can no longer be
                challenged.
              </p>
            ) : (
              <Link
                href={`/rounds/${round.id}/projects/${project.id}/challenge`}
                className="rounded-full border border-border px-5 py-2.5 text-sm text-text-primary transition-colors duration-450 hover:border-danger/40"
              >
                Challenge Evaluation
              </Link>
            )}
            <CopyLinkButton />
          </div>
        </>
      )}
    </div>
  );
}
