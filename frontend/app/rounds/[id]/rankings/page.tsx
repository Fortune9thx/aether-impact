import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { mockEvaluations, mockProjects, mockRounds } from "@/lib/mock-data";
import { RankingRow } from "@/components/round/RankingRow";

export default async function RankingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const round = mockRounds.find((r) => r.id === id);
  if (!round) notFound();

  const ranked = mockProjects
    .filter((p) => p.roundId === id)
    .map((project) => ({
      project,
      evaluation: mockEvaluations.find((e) => e.projectId === project.id),
    }))
    .filter(
      (entry): entry is { project: typeof entry.project; evaluation: NonNullable<typeof entry.evaluation> } =>
        Boolean(entry.evaluation),
    )
    .sort((a, b) => b.evaluation.overallScore - a.evaluation.overallScore);

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

      {ranked.length === 0 ? (
        <p className="mt-14 text-text-secondary">
          No evaluated submissions yet.
        </p>
      ) : (
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
    </div>
  );
}
