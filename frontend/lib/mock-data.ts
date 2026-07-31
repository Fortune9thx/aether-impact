import { Evaluation, Project, Round } from "./types";

export const mockRounds: Round[] = [
  {
    id: "r1",
    title: "Public Goods Round — Q3 2026",
    description:
      "Evaluating infrastructure and tooling projects that shipped measurable impact for the ecosystem this quarter.",
    criteria:
      "Prioritize projects with verifiable on-chain usage, sustained maintenance, and evidence of downstream adoption by other builders.",
    dimensions: [
      { id: "d1", label: "Verifiable Impact", weight: 40 },
      { id: "d2", label: "Technical Quality", weight: 25 },
      { id: "d3", label: "Ecosystem Value", weight: 20 },
      { id: "d4", label: "Sustainability", weight: 15 },
    ],
    status: "open",
    submissionCount: 12,
    createdAt: "2026-07-01",
  },
  {
    id: "r2",
    title: "Developer Tooling Retro",
    description:
      "A focused round for SDKs, libraries, and dev tooling that reduced friction for GenLayer builders.",
    criteria:
      "Favor tools with active usage, clear documentation, and reproducible evidence of adoption via downloads or dependent repos.",
    dimensions: [
      { id: "d1", label: "Adoption", weight: 45 },
      { id: "d2", label: "Code Quality", weight: 30 },
      { id: "d3", label: "Documentation", weight: 25 },
    ],
    status: "evaluating",
    submissionCount: 8,
    createdAt: "2026-06-12",
  },
  {
    id: "r3",
    title: "Community & Education Round",
    description:
      "Recognizing content, workshops, and community initiatives that grew the builder base.",
    criteria:
      "Reward reach and depth of educational content, with evidence of engagement and follow-on contributions.",
    dimensions: [
      { id: "d1", label: "Reach", weight: 35 },
      { id: "d2", label: "Depth", weight: 35 },
      { id: "d3", label: "Follow-on Contribution", weight: 30 },
    ],
    status: "closed",
    submissionCount: 21,
    createdAt: "2026-04-20",
  },
];

export const mockProjects: Project[] = [
  {
    id: "p1",
    roundId: "r1",
    name: "Cartographer SDK",
    description:
      "An open-source SDK that maps GenLayer contract storage into typed client interfaces, cutting integration time for frontend teams.",
    claimedImpact:
      "Adopted by 40+ downstream projects, reducing integration time from days to hours based on developer surveys and dependent-repo counts.",
    evidence: [
      { id: "e1", label: "GitHub repo", url: "https://github.com/example/cartographer-sdk" },
      { id: "e2", label: "npm downloads", url: "https://www.npmjs.com/package/cartographer-sdk" },
      { id: "e3", label: "Dependent repos", url: "https://github.com/example/cartographer-sdk/network/dependents" },
    ],
  },
];

export const mockEvaluations: Evaluation[] = [
  {
    id: "eval-p1",
    projectId: "p1",
    overallScore: 84,
    confidence: 78,
    dimensionScores: [
      {
        dimensionId: "d1",
        label: "Verifiable Impact",
        score: 88,
        reasoning:
          "Dependent-repo count and npm download trends corroborate the claimed adoption figure independently of the submission's own framing.",
      },
      {
        dimensionId: "d2",
        label: "Technical Quality",
        score: 82,
        reasoning:
          "Codebase shows consistent typing, test coverage, and a clear changelog, though some modules lack documentation.",
      },
      {
        dimensionId: "d3",
        label: "Ecosystem Value",
        score: 85,
        reasoning:
          "Reduces a well-known integration bottleneck cited across multiple community discussions.",
      },
      {
        dimensionId: "d4",
        label: "Sustainability",
        score: 76,
        reasoning:
          "Maintained by a single core contributor; commit cadence has slowed over the last two months.",
      },
    ],
    reasoning:
      "Cartographer SDK demonstrates strong, independently verifiable adoption and clear ecosystem value. The claimed impact is well substantiated by evidence rather than self-reported metrics alone. Confidence is moderated by single-maintainer risk and a narrowing contribution window, which affects long-term sustainability more than current impact.",
    citedEvidence: [
      "https://github.com/example/cartographer-sdk",
      "https://www.npmjs.com/package/cartographer-sdk",
      "https://github.com/example/cartographer-sdk/network/dependents",
    ],
    challenged: false,
  },
];
