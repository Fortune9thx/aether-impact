import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { mockEvaluations, mockProjects, mockRounds } from "@/lib/mock-data";
import { ScoreReveal } from "@/components/evaluation/ScoreReveal";
import { DimensionScoreRow } from "@/components/evaluation/DimensionScoreRow";
import { CitedEvidenceList } from "@/components/evaluation/CitedEvidenceList";

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id, projectId } = await params;
  const round = mockRounds.find((r) => r.id === id);
  const project = mockProjects.find((p) => p.id === projectId);
  const evaluation = mockEvaluations.find((e) => e.projectId === projectId);

  if (!round || !project || !evaluation) notFound();

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

      {evaluation.challenged && (
        <div className="mt-6 flex items-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger w-fit">
          <AlertTriangle className="h-3.5 w-3.5" />
          Re-evaluated after challenge
        </div>
      )}

      <div className="mt-14 flex items-center justify-center gap-16 rounded-2xl border border-border bg-surface py-14">
        <ScoreReveal score={evaluation.overallScore} label="Overall Score" size="lg" />
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
          {evaluation.dimensionScores.map((dimension, index) => (
            <DimensionScoreRow
              key={dimension.dimensionId}
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
          <CitedEvidenceList urls={evaluation.citedEvidence} />
        </div>
      </div>

      <div className="mt-16 flex items-center justify-between border-t border-border pt-8">
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
      </div>
    </div>
  );
}
