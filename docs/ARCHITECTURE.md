# Architecture

## Overview

Aether Impact has no backend and no database. The Next.js frontend reads and writes directly to a single GenLayer Intelligent Contract, `ImpactEvaluator.py`. All state — rounds, submissions, evaluations, challenges — lives on-chain.

```
Browser (MetaMask)
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

All contract collections are `TreeMap[str, str]` with JSON-encoded values. This is a deliberate, tested constraint: on the current Bradbury GenVM build, any other `TreeMap` value type (typed dataclasses, `u256`, `bool`) deploys successfully but becomes permanently unreadable after acceptance. `TreeMap[str, str]` + `json.dumps`/`json.loads` is the only pattern verified to be reliably readable. See the contract's inline comment and `scripts/smoke.mjs`, which exists specifically to catch a silent regression of this kind on every redeploy.

## Evaluation flow

1. `create_round(title, description, criteria, dimensions_json)` — validates dimension weights sum to exactly 100, stores the round, records the creator as owner.
2. `submit_project(round_id, name, description, claimed_impact, evidence_json)` — validates the round is open and evidence URLs are `http(s)`.
3. `evaluate_project(project_id)` — builds a structured prompt from the round's criteria/dimensions and the project's description/evidence, then calls `gl.eq_principle.prompt_non_comparative` so GenLayer's validator set reaches consensus on the score, confidence, per-dimension breakdown, and cited evidence — not just one model's raw output. Refuses to run twice on an already-evaluated project.
4. `challenge_evaluation(project_id, new_evidence_json)` — appends new evidence, re-runs the same evaluation flow, and marks the evaluation as `challenged`. Blocked once a round has distributed funds.

## Roles

- **Round admin**: the round's `creator` plus anyone in its `admins` list (both stored as address strings inside the round's JSON record — not a typed `TreeMap[Address, bool]`, for the same storage-safety reason described below). Only admins can `close_round`, `compute_distribution`, `add_admin`, `remove_admin`. The creator can never be removed.
- **Project owner**: the `submitter` address recorded on `submit_project`. Only the owner can `claim_payout`.
- Everyone else has public read/submit/challenge access.

## Funding & distribution

1. `fund_round(round_id)` — a payable write; anyone can add GEN to a round's pool.
2. `compute_distribution(round_id)` — admin-only, requires the round to be closed and not yet distributed. Splits the pool proportionally across evaluated projects by `overall_score` (integer division; any rounding dust stays in the contract). Stores each project's `payout` and resets `claimed` to `False`.
3. `claim_payout(project_id)` — owner-only, marks `claimed = True` and returns the amount.

**Known limitation (unresolved as of 2026-07-31):** `claim_payout` records the submitter's entitlement on-chain but does **not** move GEN. The documented `gl.evm.contract_interface` pattern for a contract to pay out its own balance to a plain wallet address —
```python
@gl.evm.contract_interface
class _Recipient:
    class View: pass
    class Write: pass
_Recipient(Address(recipient)).emit_transfer(value=amount)
```
— was tested against this contract (both as a plain `@gl.public.write` and as `@gl.public.write.payable`) and confirmed non-functional: the transaction reaches `ACCEPTED` with no error, but direct balance checks before/after showed the contract's balance never decreased and the recipient (an EOA) received nothing beyond their own gas cost. Reproduced twice with fresh deploys. Until the correct native-transfer primitive is confirmed, treat `claimed`/`payout` as the source of truth for who is owed what, and settle actual fund movement off-chain.

## Frontend

- `lib/genlayer.ts` — chain config and typed `readContract`/`writeContract` wrappers.
- `lib/use-contract-read.ts` — a small hook wrapping reads with loading/error state.
- `components/providers/WalletProvider.tsx` — MetaMask connect via `genlayer-js`'s `client.connect()`.
- Every write-gated page (`/rounds/new`, `/submit`, the evaluation trigger, `/challenge`) shows a real pending state while the transaction is in flight, since LLM-consensus writes are not instant.
- No mock data anywhere — if `NEXT_PUBLIC_CONTRACT_ADDRESS` isn't set, the app shows an explicit "not configured" state rather than fabricating content.
