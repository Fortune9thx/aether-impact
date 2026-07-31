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
  {
    id: "p2",
    roundId: "r1",
    name: "Ledger Notary",
    description:
      "A lightweight attestation service that timestamps and signs off-chain documents against GenLayer state.",
    claimedImpact:
      "Used by three grant programs to notarize disbursement records, reducing audit time by roughly half.",
    evidence: [
      { id: "e4", label: "GitHub repo", url: "https://github.com/example/ledger-notary" },
      { id: "e5", label: "Integration case study", url: "https://example.com/case-studies/ledger-notary" },
    ],
  },
  {
    id: "p3",
    roundId: "r1",
    name: "Signal Relay",
    description:
      "An event-relay service that forwards GenLayer contract events to Discord and Slack for community visibility.",
    claimedImpact:
      "Deployed in 15 community servers, driving higher engagement around governance votes.",
    evidence: [
      { id: "e6", label: "GitHub repo", url: "https://github.com/example/signal-relay" },
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
  {
    id: "eval-p2",
    projectId: "p2",
    overallScore: 71,
    confidence: 65,
    dimensionScores: [
      {
        dimensionId: "d1",
        label: "Verifiable Impact",
        score: 68,
        reasoning:
          "The case study supports adoption by grant programs but does not quantify the audit-time reduction independently.",
      },
      {
        dimensionId: "d2",
        label: "Technical Quality",
        score: 74,
        reasoning: "Clean, well-tested codebase with a narrow, well-scoped feature set.",
      },
      {
        dimensionId: "d3",
        label: "Ecosystem Value",
        score: 70,
        reasoning: "Useful but addresses a narrower need than broader developer tooling.",
      },
      {
        dimensionId: "d4",
        label: "Sustainability",
        score: 72,
        reasoning: "Small but active maintenance cadence over the past quarter.",
      },
    ],
    reasoning:
      "Ledger Notary shows credible, if modest, adoption within grant tooling. Evidence supports the claim directionally but lacks independent quantification of the audit-time savings, which tempers confidence relative to more thoroughly documented submissions.",
    citedEvidence: [
      "https://github.com/example/ledger-notary",
      "https://example.com/case-studies/ledger-notary",
    ],
    challenged: false,
  },
  {
    id: "eval-p3",
    projectId: "p3",
    overallScore: 52,
    confidence: 58,
    dimensionScores: [
      {
        dimensionId: "d1",
        label: "Verifiable Impact",
        score: 45,
        reasoning:
          "No independent evidence of the claimed 15-server deployment beyond the repository itself.",
      },
      {
        dimensionId: "d2",
        label: "Technical Quality",
        score: 60,
        reasoning: "Functional but minimal test coverage and sparse documentation.",
      },
      {
        dimensionId: "d3",
        label: "Ecosystem Value",
        score: 55,
        reasoning: "Solves a real but narrow visibility problem for community operators.",
      },
      {
        dimensionId: "d4",
        label: "Sustainability",
        score: 48,
        reasoning: "Single commit burst with no maintenance activity since.",
      },
    ],
    reasoning:
      "Signal Relay's core claim is plausible but unsubstantiated beyond the submission's own description. Without independent evidence of the stated deployment footprint, the score reflects code quality and concept value rather than verified impact.",
    citedEvidence: ["https://github.com/example/signal-relay"],
    challenged: false,
  },
];
