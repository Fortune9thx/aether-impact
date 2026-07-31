# Aether Impact

A GenLayer-powered retroactive impact funding evaluation engine. DAOs, foundations, and protocols run scalable, transparent impact evaluations using GenLayer Intelligent Contracts: natural language criteria, live evidence review, and Optimistic Democracy consensus in place of slow manual badgeholder review.

## Live

- **Frontend:** https://aether-impact.vercel.app
- **Contract:** `ImpactEvaluator.py` on GenLayer Bradbury testnet at `0x06748948F830F200eF34cC05717c8a7EA8C9f42B`

## Project Overview

A round is created with natural language evaluation criteria and weighted dimensions. Builders submit a project: what they built, the impact they claim, and evidence links. Anyone can trigger evaluation: the Intelligent Contract reads the criteria and evidence, reasons through it with an LLM, and reaches consensus across independent GenLayer validators under the Equivalence Principle. Every score ships with reasoning, a confidence level, and cited evidence. Evaluations can be challenged with new evidence, which triggers a fresh, on-chain re-evaluation.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion |
| Web3 | `genlayer-js`, `viem`, MetaMask wallet connect |
| Contracts | GenLayer Intelligent Contracts (Python), GenVM Equivalence Principle for LLM consensus |
| Network | GenLayer Bradbury testnet |
| Hosting | Vercel |

## Repository Structure

```
aether-impact/
├── contracts/
│   └── ImpactEvaluator.py     # Round/project/evaluation/challenge logic
├── prompts/
│   └── evaluation-prompt.md   # Evaluation prompt design notes
├── docs/
│   ├── DEPLOYMENT.md          # Live contract + frontend deployment info
│   └── ARCHITECTURE.md        # How the pieces fit together
├── frontend/
│   ├── app/                   # Next.js routes
│   ├── components/            # UI, round, evaluation, motion components
│   ├── lib/                   # genlayer-js client, types, hooks
│   └── scripts/               # deploy.mjs, smoke.mjs
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

**Distribution model:** `compute_distribution` computes each submitter's proportional entitlement on-chain from the evaluation scores and records it (`payout` amount + `paid` flag). The round admin settles payouts and calls `mark_paid` to record settlement on-chain, a deliberate two-phase design that keeps the scoring and allocation logic fully on-chain and auditable while payment execution stays under admin control. See `docs/ARCHITECTURE.md` for the full technical detail.
