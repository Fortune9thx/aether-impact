# Deployment

## Contract

| | |
|---|---|
| Contract | `ImpactEvaluator` |
| Network | GenLayer Bradbury testnet |
| Address | `0x98A161e781A01ace184A472101AB6583AA3bc02f` |
| Deployed | 2026-07-31 |

Verified via `frontend/scripts/smoke.mjs` (read → write → re-read) and `frontend/scripts/lifecycle-test.mjs` — a full round trip run against the live contract: create round, submit project, run a real LLM evaluation through `gl.eq_principle`, challenge it with new evidence and confirm re-evaluation, then close the round. All 5 checks pass.

**Superseded addresses:**
- `0x31aDeF6CB32e0DA12c3Dc3E8e023d8219A44734b` — the first deploy. `evaluate_project` asked the LLM to compute `overall_score` itself; validators rounded the weighted average differently and the Equivalence Principle sometimes failed to reach consensus (`UNDETERMINED`). Fixed by having the contract compute `overall_score` deterministically from the model's per-dimension scores — the LLM is only asked to judge, never to do the final arithmetic.
- `0xe6e557b6Cd3591e1eEd7b393643562dB24b23909` — had the arithmetic fix, but the Equivalence Principle criteria was still too strict ("reasoning must cite specific evidence links provided" is subjective enough that validators occasionally diverged, especially with weak evidence). Loosened the criteria to focus on structural validity (score ranges) and "reasonably close" judgment rather than exact phrasing agreement.
- `0x39B6c36264213f26b9ae43f2E93Db84b7Aa58e3C` — added `fund_round`/`compute_distribution`/`claim_payout`. `claim_payout` used `gl.evm.contract_interface`'s `emit_transfer` to pay the submitter, which was confirmed (via direct balance checks) to not actually move funds. Superseded by a version with a proper `creator`/`admins` permission model and `claim_payout` as a pull-record only (see "Known limitation" below) until the correct transfer primitive is confirmed.

**Known limitation — payout transfer:** `claim_payout` marks a project's payout as claimed but does not move GEN. The standard pattern for a contract to pay its own balance out to a plain wallet address —
```python
@gl.evm.contract_interface
class _Recipient:
    class View: pass
    class Write: pass
_Recipient(Address(recipient)).emit_transfer(value=amount)
```
was tested directly against this contract (both non-payable and `@gl.public.write.payable`) and confirmed non-functional: the transaction reaches `ACCEPTED` with no error, but the contract's on-chain balance never decreases and the recipient (a plain EOA) receives nothing beyond their own gas refund. Reproduced twice with fresh deploys and isolated single-call tests. Reported to the GenLayer team; `payout`/`claimed` remain the source of truth for entitlement until this is resolved and fund settlement happens off-chain in the meantime.

**Frontend hardening from this testing:** `genlayer-js`'s `waitForTransactionReceipt` resolves without throwing on any "decided" terminal state — including `UNDETERMINED`, not just `ACCEPTED`/`FINALIZED`. The frontend's `writeContract` wrapper (`lib/genlayer.ts`) now explicitly checks the final status and throws a clear error if consensus wasn't actually reached, so the UI never reports success when a write silently did nothing. Contract error messages (which arrive as a raw GenVM struct with a Python traceback buried inside) are also parsed down to just the exception message before reaching the UI.

## Frontend

Deployed on Vercel from the `frontend/` directory (Next.js root). Production environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x98A161e781A01ace184A472101AB6583AA3bc02f` |
| `NEXT_PUBLIC_GENLAYER_NETWORK` | `testnet-bradbury` |

## Redeploying the contract

If the contract is redeployed (schema change, bug fix), the address changes:

```bash
cd frontend
npm run deploy   # requires .env.deploy with a funded DEPLOYER_PRIVATE_KEY
npm run smoke    # confirm read/write/re-read before trusting the new address
```

Then update `NEXT_PUBLIC_CONTRACT_ADDRESS` in both `frontend/.env.local` and the Vercel project's environment variables, and redeploy the frontend.
