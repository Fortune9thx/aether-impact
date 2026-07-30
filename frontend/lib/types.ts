export type Dimension = {
  id: string;
  label: string;
  weight: number;
};

export type RoundStatus = "draft" | "open" | "evaluating" | "closed";

export type Round = {
  id: string;
  title: string;
  description: string;
  criteria: string;
  dimensions: Dimension[];
  status: RoundStatus;
  submissionCount: number;
  createdAt: string;
};

export type EvidenceLink = {
  id: string;
  url: string;
  label: string;
};

export type Project = {
  id: string;
  roundId: string;
  name: string;
  description: string;
  claimedImpact: string;
  evidence: EvidenceLink[];
};

export type DimensionScore = {
  dimensionId: string;
  label: string;
  score: number;
  reasoning: string;
};

export type Evaluation = {
  id: string;
  projectId: string;
  overallScore: number;
  confidence: number;
  dimensionScores: DimensionScore[];
  reasoning: string;
  citedEvidence: string[];
  challenged: boolean;
};
