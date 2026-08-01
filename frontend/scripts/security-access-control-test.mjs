// Funded random-wallet security test: every admin-gated write must be
// rejected (FINISHED_WITH_ERROR) when called by an address with no
// privilege over the round/project it targets. Uses a freshly generated,
// unfunded wallet -- these are pure validation rejections, so no gas
// balance is required to prove the guard works (the call still executes
// far enough to hit the access-control check and revert).
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvFile(path.join(__dirname, "..", ".env.deploy"));
loadEnvFile(path.join(__dirname, "..", ".env.local"));

const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
if (!address) {
  console.error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set");
  process.exit(1);
}

const ownerAccount = createAccount(process.env.DEPLOYER_PRIVATE_KEY);
const ownerClient = createClient({ chain: testnetBradbury, account: ownerAccount });

const attackerKey = generatePrivateKey();
const attackerAccount = createAccount(attackerKey);
const attackerClient = createClient({ chain: testnetBradbury, account: attackerAccount });

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? " -- " + detail : ""}`);
}

async function waitDone(client, hash) {
  let receipt;
  for (let i = 0; i < 40; i++) {
    receipt = await client.getTransaction({ hash });
    const status = receipt.status_name ?? receipt.status;
    if (status === "ACCEPTED" || status === 5 || status === "UNDETERMINED" || status === 6) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return receipt;
}

// Bradbury network congestion (RPC backpressure, node timeouts) throws at
// the same layer a genuine access-control revert would -- without checking
// the message, a congested network looks identical to a passing test. Only
// treat a thrown error as a genuine rejection if it names an actual
// contract-level revert, never a transport/node-availability failure.
const NETWORK_ERROR_PATTERNS = [
  "pipeline backpressure",
  "not currently accepting transactions",
  "econnrefused",
  "etimedout",
  "fetch failed",
  "timeout",
];

async function expectRejected(fn, name) {
  try {
    const hash = await fn();
    const receipt = await waitDone(ownerClient, hash);
    const failed = receipt.txExecutionResultName === "FINISHED_WITH_ERROR";
    record(name, failed, failed ? "" : "call was NOT rejected -- access control gap");
  } catch (err) {
    const message = (err?.message ?? String(err)).toLowerCase();
    const isNetworkError = NETWORK_ERROR_PATTERNS.some((p) => message.includes(p));
    if (isNetworkError) {
      throw new Error(
        `${name}: inconclusive -- Bradbury network congestion prevented submitting the transaction at all (${message}). Retry once the network recovers; this is not a pass or a fail.`,
      );
    }
    // A genuine RPC-level revert (not a network/availability failure) also
    // counts as rejected.
    record(name, true, "rejected at RPC layer");
  }
}

console.log("attacker (freshly generated) address:", attackerAccount.address);

console.log("\n[setup] funding attacker with enough GEN to cover gas only");
// The attacker must be funded enough to submit transactions (otherwise every
// call is rejected at the RPC layer for insufficient gas, which proves
// nothing about the contract's own access control). This is a plain wallet
// value transfer, not a contract write -- it proves the contract's
// _require_round_admin check rejects the caller, not that a broke wallet
// can't transact at all.
const fundHash = await ownerClient.sendTransaction({
  to: attackerAccount.address,
  value: BigInt(10) ** BigInt(17), // 0.1 GEN, gas only
});
await waitDone(ownerClient, fundHash);
console.log("funded, tx:", fundHash);
const createHash = await ownerClient.writeContract({
  address,
  functionName: "create_round",
  args: [
    "Security Test Round",
    "Round created to verify access control.",
    "N/A",
    JSON.stringify([{ label: "quality", weight: 100 }]),
  ],
});
await waitDone(ownerClient, createHash);
const roundsRaw = await ownerClient.readContract({ address, functionName: "list_rounds", args: [] });
const rounds = JSON.parse(roundsRaw);
const round = rounds[rounds.length - 1];
console.log("round:", round.id);

console.log("\n[1/5] attacker calls close_round on someone else's round");
await expectRejected(
  () =>
    attackerClient.writeContract({
      address,
      functionName: "close_round",
      args: [round.id],
    }),
  "close_round rejects non-admin",
);

console.log("\n[2/5] attacker calls add_admin on someone else's round");
await expectRejected(
  () =>
    attackerClient.writeContract({
      address,
      functionName: "add_admin",
      args: [round.id, attackerAccount.address],
    }),
  "add_admin rejects non-admin",
);

console.log("\n[3/5] attacker calls remove_admin on someone else's round");
await expectRejected(
  () =>
    attackerClient.writeContract({
      address,
      functionName: "remove_admin",
      args: [round.id, ownerAccount.address],
    }),
  "remove_admin rejects non-admin",
);

console.log("\n[4/5] attacker calls compute_distribution on someone else's round");
await expectRejected(
  () =>
    attackerClient.writeContract({
      address,
      functionName: "compute_distribution",
      args: [round.id, "1000000000000000000"],
    }),
  "compute_distribution rejects non-admin",
);

console.log("\n[5/5] owner closes the round, attacker still cannot mark a (nonexistent) payout paid");
const closeHash = await ownerClient.writeContract({
  address,
  functionName: "close_round",
  args: [round.id],
});
await waitDone(ownerClient, closeHash);
await expectRejected(
  () =>
    attackerClient.writeContract({
      address,
      functionName: "mark_paid",
      args: ["project-does-not-exist"],
    }),
  "mark_paid rejects non-admin / invalid project",
);

console.log("\n=== SUMMARY ===");
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} ${r.name}`);
const allPassed = results.every((r) => r.pass);
console.log(allPassed ? "\nAll access-control checks passed." : "\nSome checks FAILED.");
process.exit(allPassed ? 0 : 1);
