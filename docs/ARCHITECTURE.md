# Architecture

## Overview

Aether Impact has no backend and no database. The Next.js frontend reads and writes directly to a single GenLayer Intelligent Contract, `ImpactEvaluator.py`. All state (rounds, submissions, evaluations, challenges) lives on-chain.

```
Browser (any EIP-6963 wallet)
   │
   ▼
Next.js frontend  ──genlayer-js──▶  ImpactEvaluator (GenLayer Bradbury)
   │                                   │
   │                                   ├─ TreeMap[str, str] storage (JSON-encoded)
   │                                   └─ gl.eq_principle.prompt_non_comparative
   │                                        └─ LLM call, agreed across validators
   ▼
Rendered rounds / evaluations / rankings
```

## Storage pattern

All contract collections are `TreeMap[str, str]` with JSON-encoded values. This is a deliberate, tested constraint: on the current Bradbury GenVM build, any other `TreeMap` value type (typed dataclasses, `u256`, `bool`) deploys successfully but becomes permanently unreadable after acceptance. `TreeMap[str, str]` plus `json.dumps`/`json.loads` is the only pattern verified to be reliably readable. See the contract's inline comment and `scripts/smoke.mjs`, which exists specifically to catch a silent regression of this kind on every redeploy.

## Evaluation flow

1. `create_round(title, description, criteria, dimensions_json)`: validates dimension weights sum to exactly 100, stores the round, records the creator as owner.
2. `submit_project(round_id, name, description, claimed_impact, evidence_json)`: validates the round is open and evidence URLs are `http(s)`.
3. `evaluate_project(project_id)`: builds a structured prompt from the round's criteria/dimensions and the project's description/evidence, then calls `gl.eq_principle.prompt_non_comparative` so GenLayer's validator set reaches consensus on the score, confidence, per-dimension breakdown, and cited evidence, not just one model's raw output. Refuses to run twice on an already-evaluated project.
4. `challenge_evaluation(project_id, new_evidence_json)`: appends new evidence, re-runs the same evaluation flow, and marks the evaluation as `challenged`. Blocked once a round has distributed funds.

## Roles

- **Round admin**: the round's `creator` plus anyone in its `admins` list (both stored as address strings inside the round's JSON record, not a typed `TreeMap[Address, bool]`, for the same storage-safety reason described above). Only admins can `close_round`, `compute_distribution`, `mark_paid`, `add_admin`, `remove_admin`. The creator can never be removed.
- **Project owner**: the `submitter` address recorded on `submit_project`.
- Everyone else has public read/submit/challenge access.

## Funding & distribution

1. `compute_distribution(round_id, pool)`: admin-only, requires the round to be closed and not yet distributed. `pool` is a plain amount (a string-encoded integer, in wei) supplied by the admin, not an attached native transfer. Splits it proportionally across evaluated projects by `overall_score` (integer division; any rounding dust is simply not distributed). Stores each project's `payout` and sets `paid` to `False`.
2. `mark_paid(project_id)`: admin-only, marks `paid = True` once the admin has settled that project's payout through an off-chain payment. Rejects a second call for an already-paid project.

**Known limitation (unresolved as of 2026-07-31, reported upstream):** a GenLayer Intelligent Contract paying out its own balance to a plain wallet address via `gl.evm.contract_interface` / `emit_transfer` does not move funds on Bradbury testnet, even though the mechanism is confirmed correct at the SDK/runtime source level and matches a pattern independently verified working on another deployed contract on the same network. This was tested exhaustively:
- payable vs non-payable, `int` vs `u256` amount, same-transaction vs settled-balance-in-a-separate-transaction, interface class declaration order, and contract header format: none of these affected the outcome.
- Confirmed the contract genuinely holds a real, settled GEN balance (verified via direct on-chain balance checks before/after a funding call).
- Confirmed forwarding from that settled balance, in its own transaction, to both a brand-new address and an address with substantial pre-existing balance/activity: both report the transaction `ACCEPTED`, but no value arrives at the recipient and the contract's own balance is not even debited.

Given all application-level variables are ruled out, this is very likely a Bradbury-side issue with how a contract-initiated native transfer is applied post-consensus. A report with the full repro has been filed with the GenLayer team. Until resolved, distribution is **pull-record only**: `compute_distribution` records each project's entitlement on-chain, and the round admin disburses actual funds off-chain, then calls `mark_paid` to record settlement. All diagnostic-only contract methods used to isolate this (`test_transfer`, `test_receive_only`, `test_forward_existing`) and the `_Recipient` interface have been removed from the shipped contract.

## Frontend

- `lib/genlayer.ts`: chain config and typed `readContract`/`writeContract` wrappers.
- `lib/use-contract-read.ts`: a small hook wrapping reads with loading/error state.
- `components/providers/WalletProvider.tsx`: EIP-6963 multi-wallet discovery (MetaMask, OKX Wallet, Rabby, and others), connecting via the actual selected wallet's provider rather than `genlayer-js`'s MetaMask-only `client.connect()`, which is not used.
- Every write-gated page (`/rounds/new`, `/submit`, the evaluation trigger, `/challenge`) shows a real pending state while the transaction is in flight, since LLM-consensus writes are not instant.
- No mock data anywhere. If `NEXT_PUBLIC_CONTRACT_ADDRESS` isn't set, the app shows an explicit "not configured" state rather than fabricating content.
