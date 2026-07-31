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
4. `challenge_evaluation(project_id, new_evidence_json)` — appends new evidence, re-runs the same evaluation flow, and marks the evaluation as `challenged`.

## Frontend

- `lib/genlayer.ts` — chain config and typed `readContract`/`writeContract` wrappers.
- `lib/use-contract-read.ts` — a small hook wrapping reads with loading/error state.
- `components/providers/WalletProvider.tsx` — MetaMask connect via `genlayer-js`'s `client.connect()`.
- Every write-gated page (`/rounds/new`, `/submit`, the evaluation trigger, `/challenge`) shows a real pending state while the transaction is in flight, since LLM-consensus writes are not instant.
- No mock data anywhere — if `NEXT_PUBLIC_CONTRACT_ADDRESS` isn't set, the app shows an explicit "not configured" state rather than fabricating content.
