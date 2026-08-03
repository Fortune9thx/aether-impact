# Aether Impact

A GenLayer-powered retroactive impact funding evaluation engine. DAOs, foundations, and protocols run scalable, transparent impact evaluations using GenLayer Intelligent Contracts: natural language criteria, live evidence review, and Optimistic Democracy consensus in place of slow manual badgeholder review.

## Live

- **Frontend:** https://aether-impact.vercel.app
- **Contract:** `ImpactEvaluator.py` on GenLayer Bradbury testnet at `0x1027296C41628A3670AF66E5f1F1a9Ba1a40689a`

## Project Overview

A round is created with natural language evaluation criteria and weighted dimensions. Builders submit a project: what they built, the impact they claim, and evidence links. Anyone can trigger evaluation: the Intelligent Contract reads the criteria and evidence, reasons through it with an LLM, and reaches consensus across independent GenLayer validators under the Equivalence Principle. Every score ships with reasoning, a confidence level, and cited evidence. Evaluations can be challenged with new evidence, which triggers a fresh, on-chain re-evaluation.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion |
| Web3 | `genlayer-js`, `viem`, EIP-6963 multi-wallet connect (MetaMask, OKX Wallet, Rabby, and others) |
| Contracts | GenLayer Intelligent Contracts (Python), GenVM Equivalence Principle for LLM consensus |
| Network | GenLayer Bradbury testnet |
| Hosting | Vercel |

## Repository Structure

```
aether-impact/
├── contracts/
│   └── ImpactEvaluator.py     # Round/project/evaluation/challenge logic
├── docs/
│   ├── DEPLOYMENT.md          # Live contract + frontend deployment info
│   └── ARCHITECTURE.md        # How the pieces fit together
├── frontend/
│   ├── app/                   # Next.js routes
│   ├── components/            # UI, round, evaluation, motion components
│   ├── lib/                   # genlayer-js client, types, hooks
│   └── scripts/               # deploy, smoke, lifecycle, and security tests
└── README.md
```

## Getting Started

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_CONTRACT_ADDRESS
npm run dev
```

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed `ImpactEvaluator` contract address |
| `NEXT_PUBLIC_GENLAYER_NETWORK` | One of `localnet`, `studionet`, `testnet-asimov`, `testnet-bradbury` |
| `DEPLOYER_PRIVATE_KEY` | (deploy-only, `frontend/.env.deploy`, gitignored) key used by `scripts/deploy.mjs` / `scripts/smoke.mjs` |

## Deploying the Contract

```bash
cd frontend
cp .env.deploy.example .env.deploy   # fill in a funded DEPLOYER_PRIVATE_KEY
npm run deploy   # deploys contracts/ImpactEvaluator.py, prints the address
npm run smoke    # end-to-end check: read -> write -> re-read
```

See `docs/DEPLOYMENT.md` for the current live address and network.

## MVP Scope

In scope: round creation (with a creator/admins permission model), project submission, AI evaluation, challenges, proportional token distribution, rankings, a public shareable evaluation view.
Out of scope: complex governance beyond round admins, multi-chain bridging.

**Distribution model:** On-chain, `compute_distribution` computes each submitter's proportional entitlement from the evaluation scores and records it (`payout` amount + `paid` flag), with a configurable **max share cap** (default 40%) so no single project can absorb the whole pool; amounts freed by the cap are redistributed proportionally among the other projects, and any unassignable remainder is recorded on the round as `undistributed`. Actual GEN settlement is currently handled off-chain, by the round admin, who calls `mark_paid` once payment is sent, due to a known limitation on GenLayer Bradbury testnet: a contract cannot currently transfer its own GEN balance to a wallet address (confirmed, reported upstream, full repro in `SECURITY.md`). Scores, entitlements, and paid/unpaid status are all real on-chain state; the GEN itself does not move automatically yet. See `docs/ARCHITECTURE.md` and `docs/DEPLOYMENT.md` for the full technical detail.

## Response to Review Feedback

A GenLayer reviewer flagged four weaknesses in the evaluation system. Each was addressed in the contract, not just in documentation:

1. **"Output validation does not require exactly one score for every configured dimension, or reject duplicate/unknown labels."** Fixed: `_validate_dimension_scores` enforces exactly one score per configured dimension with exact label matching; missing, duplicate, and unrecognized labels each abort the call with a specific error before anything is stored. Duplicate labels are also rejected at round creation, so the aggregate is strictly schema-driven.
2. **"Cited evidence is not bound to submitted URLs."** Fixed: the model cites evidence only by integer index into the numbered list it was shown; the contract resolves indices back to the actual submitted URLs itself (`_bind_cited_evidence`), so hallucinated or free-floating citations cannot be stored. Per-evidence grounding notes (`evidence_notes`) are index-bound the same way.
3. **"Challenges overwrite the prior evaluation and can recur until distribution."** Fixed: challenges are capped at 3 per project; every re-evaluation is versioned with the prior version preserved in on-chain history; a round admin can restore any prior version via `restore_evaluation` (before distribution, with the restore itself recorded); and once distribution runs, evaluations are frozen with no write path able to modify them.
4. **"Validators do not verify domain facts from retrieved sources."** Strengthened as far as the platform allows: the prompt now requires the model, per dimension, to state which evidence it could access, quote or closely paraphrase specific retrieved content, and explain how it supports the score; validators check for concrete evidence references under the Equivalence Principle. See the limitations section below for what remains a platform boundary.

## Current Limitations & Design Trade-offs

Stated plainly rather than hidden:

- **No cryptographic verification of web content.** GenLayer validators each run the LLM and agree on outputs under the Equivalence Principle, but the platform does not currently provide a way to prove what a URL's content was at evaluation time. The prompt-level grounding requirements, index-bound citations, and per-evidence accessibility notes are the strongest measures available today; they raise the cost of ungrounded scoring, they do not make it cryptographically impossible.
- **GEN settlement is off-chain.** A contract-initiated native transfer to a wallet does not currently work on Bradbury (reported upstream with a full reproduction). Entitlements and paid status are on-chain; the transfer itself is performed by the round admin and then recorded via `mark_paid`. This makes the round admin trusted for payment execution, which is why every admin action is attributed on-chain.
- **LLM judgment is inherently subjective.** Consensus across validators bounds variance; it does not eliminate it. The challenge and restore mechanisms exist precisely because individual evaluations can be wrong.
- **Round admins are powerful within their round.** They close the round, set the pool and share cap, restore evaluation versions, and settle payment. All of these actions are permissioned, attributed, and visible on-chain, and admins have no power over other rounds.
