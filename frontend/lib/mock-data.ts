import { Round } from "./types";

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
