# Aether Impact

A GenLayer-powered retroactive impact funding evaluation engine. DAOs, foundations, and protocols run scalable, transparent impact evaluations using GenLayer Intelligent Contracts — natural language criteria, live evidence review, and Optimistic Democracy consensus in place of slow manual badgeholder review.

## Live

- **Frontend:** https://aether-impact.vercel.app
- **Contract:** `ImpactEvaluator.py` on GenLayer Bradbury testnet at `0x98A161e781A01ace184A472101AB6583AA3bc02f`

## Project Overview

A round is created with natural language evaluation criteria and weighted dimensions. Builders submit a project — what they built, the impact they claim, and evidence links. Anyone can trigger evaluation: the Intelligent Contract reads the criteria and evidence, reasons through it with an LLM, and reaches consensus across independent GenLayer validators under the Equivalence Principle. Every score ships with reasoning, a confidence level, and cited evidence. Evaluations can be challenged with new evidence, which triggers a fresh, on-chain re-evaluation.

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

**Known limitation:** `claim_payout` records a submitter's entitlement on-chain (`payout` amount + `claimed` flag) but does not itself transfer GEN — the documented `gl.evm.contract_interface` pattern for a contract paying out to a plain wallet address was tested and confirmed non-functional on this GenVM build. See `docs/ARCHITECTURE.md` for details. Fund settlement is currently handled off-chain until the correct primitive is confirmed.
