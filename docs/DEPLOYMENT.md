# Deployment

## Contract

| | |
|---|---|
| Contract | `ImpactEvaluator` |
| Network | GenLayer Bradbury testnet |
| Address | `0x06748948F830F200eF34cC05717c8a7EA8C9f42B` |
| Deployed | 2026-07-31 |

Verified read-only via `frontend/scripts/verify-clean-deploy.mjs` (confirms the contract is reachable and reports zero rounds). Deliberately **not** verified with `smoke.mjs`/`lifecycle-test.mjs` on this address: both write test data (a "Smoke Test Round", a "Lifecycle Test Round") that would show up to real users on the production frontend. The underlying contract logic itself was already verified extensively on prior addresses (see superseded list below) using those scripts before this final clean deploy.

**Superseded addresses:**
- `0x31aDeF6CB32e0DA12c3Dc3E8e023d8219A44734b`: the first deploy. `evaluate_project` asked the LLM to compute `overall_score` itself; validators rounded the weighted average differently and the Equivalence Principle sometimes failed to reach consensus (`UNDETERMINED`). Fixed by having the contract compute `overall_score` deterministically from the model's per-dimension scores, so the LLM is only asked to judge, never to do the final arithmetic.
- `0xe6e557b6Cd3591e1eEd7b393643562dB24b23909`: had the arithmetic fix, but the Equivalence Principle criteria was still too strict ("reasoning must cite specific evidence links provided" is subjective enough that validators occasionally diverged, especially with weak evidence). Loosened the criteria to focus on structural validity (score ranges) and "reasonably close" judgment rather than exact phrasing agreement.
- `0x39B6c36264213f26b9ae43f2E93Db84b7Aa58e3C`: added `fund_round`/`compute_distribution`/`claim_payout`. `claim_payout` used `gl.evm.contract_interface`'s `emit_transfer` to pay the submitter, confirmed via direct balance checks to not actually move funds.
- `0x98A161e781A01ace184A472101AB6583AA3bc02f` and several diagnostic-only redeploys: used to isolate the transfer bug (payable-value-crediting, same-tx vs settled-balance forwarding, fresh vs pre-existing recipient address, interface class ordering, header format). All ruled out as the cause; see "Known limitation" below.
- `0x7b7AFfB3b03d394FbBc13C38e743a0Ac02e62900`: first deploy after the transfer bug was isolated, with the diagnostic-only methods and `_Recipient` interface removed and `compute_distribution`/`mark_paid` in place. Superseded by a full pre-submission security audit (see `SECURITY.md`): all `raise ValueError` calls converted to `raise gl.vm.UserError` to match the confirmed-working reference contract's pattern, LLM prompt inputs sanitized against prompt injection, LLM numeric outputs clamped before use in payout arithmetic, user-supplied JSON parsing wrapped against malformed input, and challenge evidence now attributed to its submitter instead of silently merged into the original submission.
- `0x56AFBD30eE7fa115aC0286ec666521b624E80fDe`: the audited contract, verified with the full lifecycle and access-control test suites (see `SECURITY.md`). Superseded because those test runs left "Security Test Round" and "Lifecycle Test Round" entries on it, which then showed up to real visitors on the production frontend. Redeployed clean specifically to clear that test data; going forward, `smoke.mjs`/`lifecycle-test.mjs`/`security-access-control-test.mjs` should only be run against a disposable address, never the one wired to production.

**Known limitation, payout transfer (reported upstream):** a GenLayer Intelligent Contract cannot currently pay its own balance out to a plain wallet address via `gl.evm.contract_interface` / `emit_transfer` on Bradbury testnet. This was tested exhaustively: payable vs non-payable, `int` vs `u256`, same-transaction vs settled-balance-in-a-separate-transaction, interface class ordering, header format, and fresh vs pre-existing/active recipient address all made no difference. The contract was confirmed to genuinely hold a real, settled balance (verified via direct before/after on-chain balance checks), and the transfer call is mechanically identical to a pattern confirmed working on another live contract on the same network, yet the transaction reports `ACCEPTED` while no value arrives and the contract's own balance isn't even debited. This points to a Bradbury-side issue with how a contract-initiated native transfer is applied post-consensus, not the contract code. A report with the full repro has been filed with the GenLayer team.

Until resolved, distribution is pull-record only: `compute_distribution(round_id, pool)` takes the pool as a plain argument (not an attached transfer) and records each project's proportional `payout`; the round admin settles actual payment off-chain and calls `mark_paid(project_id)` to record it. The diagnostic-only methods used to isolate the bug (`test_transfer`, `test_receive_only`, `test_forward_existing`) and the `_Recipient` interface have been removed from the shipped contract.

**Frontend hardening from this testing:** `genlayer-js`'s `waitForTransactionReceipt` resolves without throwing on any "decided" terminal state, including `UNDETERMINED`, not just `ACCEPTED`/`FINALIZED`. The frontend's `writeContract` wrapper (`lib/genlayer.ts`) now explicitly checks the final status and throws a clear error if consensus wasn't actually reached, so the UI never reports success when a write silently did nothing. Contract error messages (which arrive as a raw GenVM struct with a Python traceback buried inside) are also parsed down to just the exception message before reaching the UI.

## Frontend

Deployed on Vercel from the `frontend/` directory (Next.js root). Production environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x06748948F830F200eF34cC05717c8a7EA8C9f42B` |
| `NEXT_PUBLIC_GENLAYER_NETWORK` | `testnet-bradbury` |

## Redeploying the contract

If the contract is redeployed (schema change, bug fix), the address changes:

```bash
cd frontend
npm run deploy   # requires .env.deploy with a funded DEPLOYER_PRIVATE_KEY
node scripts/verify-clean-deploy.mjs   # read-only check: reachable and empty
```

`npm run smoke` and `npm run test:lifecycle` are useful for verifying contract *logic* changes, but they write test data (a "Smoke Test Round", a "Lifecycle Test Round") that becomes visible to real users. Run those only against a disposable address you don't intend to point production at, then do a final clean deploy (no smoke/lifecycle run against it) before wiring it up for real.

Then update `NEXT_PUBLIC_CONTRACT_ADDRESS` in both `frontend/.env.local` and the Vercel project's environment variables, and redeploy the frontend.
