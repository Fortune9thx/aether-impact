# Security

Trust model, access matrix, and known limitations for `ImpactEvaluator.py`, audited against canonical GenLayer sources (`genlayerlabs/genvm` runtime source, a confirmed-deployed reference contract on the same network) rather than assumption.

## Trust model

- **No admin bootstrap key.** There is no global contract owner. Every round is its own trust boundary: the address that calls `create_round` becomes that round's `creator` and its first `admin`. Round admins can add or remove other admins for their own round only; the creator can never be removed.
- **Permissionless by default.** Anyone can create a round, submit a project, trigger an evaluation, or challenge an evaluation with new evidence. This is intentional: the whole design premise is transparent, low-friction, Optimistic-Democracy-style review, not a gated workflow.
- **No cross-contract calls.** The contract never calls out to another GenLayer contract, so the `trusted_callers` pattern (a `TreeMap[str, str]` allowlist gated by an owner-only `add_trusted_caller`) does not apply here. Noted and verified during audit, not overlooked.
- **No custody of real funds.** `compute_distribution` is intentionally **not** `@gl.public.write.payable`. See "Fund safety" below for why holding real GEN in this contract today would be actively unsafe.

## Access matrix

| Action | Who |
|---|---|
| `create_round` | anyone |
| `submit_project` | anyone, while the round is `open` |
| `evaluate_project` | anyone, once per project (rejects a second call; use `challenge_evaluation` to dispute) |
| `challenge_evaluation` | anyone, until the round has distributed funds (see "Challenge attribution" below) |
| `close_round` | round admin only |
| `add_admin` / `remove_admin` | round admin only; the round creator can never be removed |
| `compute_distribution` | round admin only, round must be `closed` and not yet distributed |
| `mark_paid` | round admin only, distribution must already be computed, rejects a second call on the same project |
| all `@gl.public.view` reads | anyone |

Every state-changing action that should be restricted is gated through `_require_round_admin`, which reads `gl.message.sender_address` fresh on each call and checks it against the round's `creator`/`admins` fields; there is no separate contract-level owner to keep in sync.

## Challenge attribution

`challenge_evaluation` is deliberately permissionless (anyone can submit counter-evidence to force a re-evaluation), matching the transparent-dispute design goal. Because of that, every evidence item now carries a `submitted_by` field (the caller's address) so a challenger's evidence is never indistinguishable from the original submitter's. Each evaluation record also stores `challenged_by`. This was a real gap found during audit: the original implementation merged challenge evidence into a project's `evidence` array with no attribution at all.

## Prompt injection

`description`, `claimed_impact`, evidence `label`s, and dimension `label`s are all untrusted, submitter-controlled strings that get interpolated directly into the LLM evaluation prompt. Before this audit, none of them were sanitized. Fixed:

- `_sanitize_for_prompt` strips `{`, `}`, and triple backticks (characters that could forge a fake JSON response block or break out of the prompt's structure), collapses newlines, and hard-caps length per field.
- Every user-controlled field passed into `_build_evaluation_prompt` goes through this sanitizer; the prompt itself also now explicitly tells the model to treat everything below the criteria heading as untrusted data, not instructions.
- All user-facing string inputs (`title`, `description`, `criteria`, `claimed_impact`, evidence `label`/`url`, dimension `label`) are length-capped at the contract level (`_require_non_empty`, `_validate_dimensions`, `_validate_evidence`), not just at the prompt-sanitization step, so oversized input is rejected before it is ever stored.

**Not applicable here:** the "two-phase strict_eq deterministic fetch, then `prompt_non_comparative` reasoning" pattern and "multi-source oracle" guidance are aimed at contracts pulling external market/price data that needs a verifiable deterministic anchor. This contract's non-deterministic block is the evaluation judgment itself (an LLM reading submitted evidence and reasoning about it under `gl.eq_principle.prompt_non_comparative`), which is exactly the case `prompt_non_comparative` is designed for: there is no separate deterministic fact to fetch first, and no numeric market feed to cross-check against a second oracle.

## LLM output handling

- `_extract_json` finds the first `{`...`}` span in the model's raw response; `json.loads` on that span is now wrapped in `try/except`, converting a malformed-JSON model response into a clean `gl.vm.UserError` instead of an uncaught `JSONDecodeError`.
- `_compute_overall_score` and `_store_evaluation` now clamp every model-provided numeric (`score`, `confidence`) into `[0, 100]` via `_clamp_int` before using it in the weighted-average arithmetic that ultimately feeds proportional fund distribution. Before this audit, an out-of-range or malformed numeric from the model would have propagated directly into the payout math.
- `reasoning`, `cited_evidence`, and per-dimension `reasoning` are all length-capped when stored, so a runaway model response cannot bloat storage.
- All user-supplied JSON arguments (`dimensions`, `evidence`, `new_evidence`) go through `_safe_json_loads`, which converts a malformed-JSON caller input into a clean `gl.vm.UserError` rather than an uncaught `JSONDecodeError`.

## Error handling

Every failure path raises `gl.vm.UserError(message)`. This was a real fix, not a style preference: the contract previously raised bare Python `ValueError` everywhere. Cross-checked against `genlayerlabs/genvm`'s own `genlayer.vm` module (`UserError` is the documented, typed mechanism for a contract-raised error) and against a confirmed-deployed, independently-built reference contract on the same network (`MercoraMarket`), which exclusively uses `raise gl.vm.UserError(...)` and never a bare `ValueError`. All 30 raise sites in this contract were converted to match.

## Storage

- All collections are `TreeMap[str, str]` with `json.dumps`/`json.loads` values: the only storage pattern verified reliably readable on the current Bradbury GenVM build (any typed `TreeMap` value, such as a dataclass, `u256`, or `bool`, deploys successfully but becomes permanently unreadable after acceptance). `scripts/smoke.mjs` exists specifically to catch a silent regression of this on every redeploy.
- Class-level type annotations only; every collection is populated by key inside `__init__`/methods, never by reassigning the whole `TreeMap` object.
- Amounts and counters use plain Python `int` arithmetic (converted to/from `str` for storage), not `u256`, specifically because `u256` cannot safely live inside a `TreeMap` value on this build. Python's arbitrary-precision integers are not a correctness risk at the wei scale this contract operates at.
- Every user-controlled string now has an explicit max length enforced at the contract level (title 200, description/criteria 4000, claimed_impact 3000, evidence label 200 / url 500, dimension label 200), closing a gap where unbounded input could bloat storage or widen the prompt-injection surface.

## Fund safety

**`compute_distribution` is intentionally not payable, and the contract never attempts a live on-chain transfer.** This is a deliberate, audited decision, not an oversight:

- A GenLayer Intelligent Contract paying its own balance out to a plain wallet address via `gl.evm.contract_interface` / `emit_transfer` does not move funds on the current Bradbury testnet, confirmed by direct on-chain balance measurement across multiple isolated tests (same-transaction and settled-balance-in-a-separate-transaction, fresh and pre-existing recipient addresses). Receiving value into the contract works correctly and was independently confirmed; only the outbound leg fails, silently (the transaction reports `ACCEPTED` with no thrown error, and the contract's own balance is not even debited). Full repro filed with the GenLayer team; see `docs/ARCHITECTURE.md` and `docs/DEPLOYMENT.md`.
- Given that, making `compute_distribution` payable and accepting a real GEN pool would permanently lock those funds in the contract with no working withdrawal path. Not accepting a live transfer at all, and instead recording exact proportional entitlements on-chain (`compute_distribution(round_id, pool)` takes `pool` as a plain integer argument) for the round admin to settle off-chain via `mark_paid`, is the safer design under the current constraint.
- Standard fund-safety patterns (checks-effects-interactions ordering, `int(gl.message.value) >= required_amount` on repayments, explicit handling of failed transfers) do not apply because there is no live transfer path in this contract today. If/when the platform-level transfer bug is resolved, re-introducing a payable flow should re-apply CEI (zero the recorded entitlement before attempting the transfer, never after) and re-run the funded access-control and value-flow tests below before considering it safe.

## State guards

- **Double-resolution:** `compute_distribution` raises if `record.get("distributed")` is already `True`. `mark_paid` raises if the target project's `paid` is already `True`.
- **Position-lock equivalent:** `evaluate_project` raises if an evaluation already exists for a project (`challenge_evaluation` is the explicit, intentional override path for that lock, not a bypass of it).
- **Already-repaid equivalent:** `mark_paid` checks `paid` before allowing itself to run, and requires `distributed` to already be `True`.

## Client (frontend)

- One shared, singleton read client (`getReadClient()` in `lib/genlayer.ts`); no client is created per read call.
- There is no server-held write key in the deployed app: every write is signed client-side through the connected wallet (MetaMask), so the "write client server-side only, never `NEXT_PUBLIC_`" guidance applies to a different architecture (a backend relayer signing on users' behalf) than this app uses. The one place a private key *is* used server-side is `scripts/deploy.mjs`/`scripts/smoke.mjs`, which read `DEPLOYER_PRIVATE_KEY` from `frontend/.env.deploy` (gitignored, never `NEXT_PUBLIC_`): already compliant.
- Chain switch/add (including the `wallet_addEthereumChain`/`wallet_switchEthereumChain` flow for Bradbury) is handled inside `genlayer-js`'s own `client.connect()`, which `WalletProvider.tsx` calls directly: verified by reading the library's source rather than assumed.
- No interval-based polling exists anywhere in the frontend (checked directly: no `setInterval` in the codebase). Reads are one-shot, refetched explicitly after a write settles; writes block on `waitForTransactionReceipt`, which does its own polling inside `genlayer-js`, not in application code. There is nothing here that needs a `useRef` cleanup-on-unmount guard.

### Critical bug found and fixed during this audit: `writeContract` never checked whether the contract call actually succeeded

`lib/genlayer.ts`'s `writeContract` waited for the transaction to reach `ACCEPTED`/`FINALIZED` and returned success: but reaching consensus (`status`) only means validators agreed on the outcome, which includes agreeing that the contract call *raised an error*. The actual execution outcome lives in a separate field, `txExecutionResultName`, which reports `FINISHED_WITH_ERROR` when the method raised. **Every single validation rejection (every `gl.vm.UserError`) was being reported to the user as a successful write**, because the code never checked this field. This was verified directly: a deliberately-invalid write (`close_round` on a nonexistent round) reached `status_name: "ACCEPTED"` while `txExecutionResultName: "FINISHED_WITH_ERROR"`, and the old code path returned the transaction hash as if it had succeeded.

Also found in the same investigation: the `status` field is a **number** at runtime (e.g. `5`), not the string the type declarations promise; the reliable field is the runtime's own `status_name` (snake_case). The camelCase `statusName` the published types declare is `undefined` at runtime on this `genlayer-js` version. The fix reads `status_name`/`statusName` defensively and now also checks `txExecutionResultName`, extracting the actual contract error message from `debugTraceTransaction`'s `return_data` (there is no public calldata decoder in `genlayer-js`, so this uses a best-effort printable-string heuristic with a safe generic fallback, documented inline in `lib/genlayer.ts`).

This was never caught earlier because every write this project tested throughout development used raw `genlayer-js` scripts (`lifecycle-test.mjs`, deploy/diagnostic scripts) that check status directly: never the actual browser `writeContract` wrapper every real user interaction goes through.

## Deployment verification

- `frontend/scripts/smoke.mjs` (read, write, re-read) and `frontend/scripts/lifecycle-test.mjs` (full round lifecycle: create, submit, evaluate, challenge, close, distribute, mark paid) are run after every redeploy.
- `frontend/scripts/security-access-control-test.mjs` (added by this audit): a freshly generated, unfunded wallet attempts every admin-gated write against a round it has no privilege over, and the test asserts each one comes back `FINISHED_WITH_ERROR`.
- A transient revert on Bradbury (network congestion, not a code defect) is retried once before being treated as a real failure, matching observed testnet behavior throughout this project.

## Known limitation

See `docs/ARCHITECTURE.md` and `docs/DEPLOYMENT.md` for the full write-up: a GenLayer Intelligent Contract cannot currently transfer its own GEN balance to a plain wallet address on Bradbury testnet. This has been reported upstream with a full reproduction. Distribution is pull-record only (on-chain, auditable computation of entitlements; off-chain settlement by the round admin) until that is resolved.
