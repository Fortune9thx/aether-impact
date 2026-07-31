# Deployment

## Contract

| | |
|---|---|
| Contract | `ImpactEvaluator` |
| Network | GenLayer Bradbury testnet |
| Address | `0x31aDeF6CB32e0DA12c3Dc3E8e023d8219A44734b` |
| Deployed | 2026-07-31 |

Verified via `frontend/scripts/smoke.mjs`: a fresh read (`list_rounds` → `[]`), a write (`create_round`, reached validator consensus), and a re-read confirming the write persisted and is readable — not just that the deploy transaction was accepted.

## Frontend

Deployed on Vercel from the `frontend/` directory (Next.js root). Production environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x31aDeF6CB32e0DA12c3Dc3E8e023d8219A44734b` |
| `NEXT_PUBLIC_GENLAYER_NETWORK` | `testnet-bradbury` |

## Redeploying the contract

If the contract is redeployed (schema change, bug fix), the address changes:

```bash
cd frontend
npm run deploy   # requires .env.deploy with a funded DEPLOYER_PRIVATE_KEY
npm run smoke    # confirm read/write/re-read before trusting the new address
```

Then update `NEXT_PUBLIC_CONTRACT_ADDRESS` in both `frontend/.env.local` and the Vercel project's environment variables, and redeploy the frontend.
