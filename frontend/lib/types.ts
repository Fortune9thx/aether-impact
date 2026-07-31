// These types mirror the JSON records produced by contracts/ImpactEvaluator.py
// exactly (snake_case, same field names) so there is no transformation layer
// between what the contract stores and what the frontend reads.

export type RoundStatus = "open" | "closed";

export type Dimension = {
  label: string;
  weight: number;
};

export type Round = {
  id: string;
  title: string;
  description: string;
  criteria: string;
  dimensions: Dimension[];
  status: RoundStatus;
  created_at: string;
};

export type EvidenceLink = {
  label: string;
  url: string;
};

export type Project = {
  id: string;
  round_id: string;
  name: string;
  description: string;
  claimed_impact: string;
  evidence: EvidenceLink[];
  submitted_at: string;
};

export type DimensionScore = {
  label: string;
  score: number;
  reasoning: string;
};

export type Evaluation = {
  id: string;
  project_id: string;
  overall_score: number;
  confidence: number;
  dimension_scores: DimensionScore[];
  reasoning: string;
  cited_evidence: string[];
  challenged: boolean;
};

// Client-only shape used while a dimension/evidence row is being edited in a
// form, before it's serialized into the contract's JSON args. `key` is a
// React list key only -- it is never sent to the contract.
export type DraftDimension = Dimension & { key: string };
export type DraftEvidenceLink = EvidenceLink & { key: string };
