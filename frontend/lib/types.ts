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
  pool: string; // wei, as a string (contract stores u256-scale amounts as str)
  distributed: boolean;
  creator: string;
  admins: string[];
  // Max share any single project may receive, in basis points (4000 = 40%).
  // Set when distribution is computed; absent on older records.
  max_share_bps?: number;
  // Pool remainder that the cap left unassignable (wei string).
  undistributed?: string;
};

export function isRoundAdmin(round: Round, address: string | null): boolean {
  if (!address) return false;
  const lower = address.toLowerCase();
  return (
    round.creator?.toLowerCase() === lower ||
    round.admins?.some((a) => a.toLowerCase() === lower)
  );
}

export type EvidenceLink = {
  label: string;
  url: string;
  // The address that submitted this evidence item. Present on every item
  // stored by the contract (original submission or a later challenge), so a
  // challenger's evidence is never indistinguishable from the submitter's.
  submitted_by?: string;
};

export type Project = {
  id: string;
  round_id: string;
  name: string;
  description: string;
  claimed_impact: string;
  evidence: EvidenceLink[];
  submitted_at: string;
  submitter: string;
  payout: string; // wei, as a string
  paid: boolean;
};

export function isProjectOwner(project: Project, address: string | null): boolean {
  if (!address) return false;
  return project.submitter?.toLowerCase() === address.toLowerCase();
}

export type Payout = {
  project_id: string;
  name: string;
  submitter: string;
  payout: string;
  paid: boolean;
};

export type DimensionScore = {
  label: string;
  score: number;
  reasoning: string;
};

// A grounding note the model recorded per evidence item, bound server-side
// to the actual submitted evidence by index.
export type EvidenceNote = {
  index: number;
  url: string;
  note: string;
};

// A snapshot of a superseded evaluation, kept when a challenge re-evaluates
// or when an admin restores a prior version.
export type EvaluationHistoryEntry = {
  version: number;
  overall_score: number;
  confidence: number;
  dimension_scores: DimensionScore[];
  reasoning: string;
  cited_evidence: string[];
  evidence_notes?: EvidenceNote[];
  challenged: boolean;
  challenged_by: string;
};

export type Evaluation = {
  id: string;
  project_id: string;
  // Increments each time the evaluation is re-run via a challenge; 1 for the
  // original. Older contracts may not include it.
  version?: number;
  overall_score: number;
  confidence: number;
  dimension_scores: DimensionScore[];
  reasoning: string;
  // Bound server-side to the project's actual submitted evidence URLs -- the
  // contract only accepts index citations from the model, never free text.
  cited_evidence: string[];
  challenged: boolean;
  // The address that triggered the challenge that produced this evaluation
  // (empty string if this is the original, unchallenged evaluation).
  challenged_by: string;
  // Total challenges consumed (the contract caps these per project).
  challenge_count?: number;
  // Per-evidence accessibility/grounding notes from the model, index-bound.
  evidence_notes?: EvidenceNote[];
  // Set when a round admin restored a prior version: which version was
  // promoted back to current, and by whom.
  restored_from?: number;
  restored_by?: string;
  // Prior evaluation snapshots, oldest first, bounded on-chain.
  history?: EvaluationHistoryEntry[];
};

// Client-only shape used while a dimension/evidence row is being edited in a
// form, before it's serialized into the contract's JSON args. `key` is a
// React list key only -- it is never sent to the contract.
export type DraftDimension = Dimension & { key: string };
export type DraftEvidenceLink = EvidenceLink & { key: string };
