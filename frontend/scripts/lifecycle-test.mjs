import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient, createAccount } from "genlayer-js";
import {
  localnet,
  studionet,
  testnetAsimov,
  testnetBradbury,
} from "genlayer-js/chains";

const NETWORKS = {
  localnet,
  studionet,
  "testnet-asimov": testnetAsimov,
  "testnet-bradbury": testnetBradbury,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, "..", ".env.deploy"));
loadEnvFile(path.join(__dirname, "..", ".env.local"));

const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const networkName = process.env.GENLAYER_NETWORK ?? process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "testnet-bradbury";
const chain = NETWORKS[networkName];
const account = createAccount(process.env.DEPLOYER_PRIVATE_KEY);
const client = createClient({ chain, account });

function log(step, msg) {
  console.log(`\n[${step}] ${msg}`);
}

async function waitAccepted(hash, label) {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const tx = await client.getTransaction({ hash });
    process.stdout.write(`  ${label} poll ${i + 1}: status=${tx.status}\n`);
    if (tx.status === 5 || tx.status === 7) return tx;
    if (tx.status === 6 || tx.status === 8) {
      throw new Error(`${label} failed with status ${tx.status}`);
    }
  }
  throw new Error(`${label} timed out waiting for acceptance`);
}

// Bradbury reads can lag briefly behind an accepted write -- retry until the
// expected array is non-empty rather than trusting the first read.
async function readListWithRetry(functionName, args, label) {
  for (let i = 0; i < 10; i++) {
    const raw = await client.readContract({ address, functionName, args });
    const parsed = JSON.parse(raw);
    if (parsed.length > 0) return parsed;
    console.log(`  ${label}: empty, retrying (${i + 1}/10)...`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${label} stayed empty after retries`);
}

// Same read-after-write lag, but for a single object where we're waiting on
// a specific field to reflect the write (e.g. challenged flipping to true).
async function readUntil(functionName, args, predicate, label) {
  let last;
  for (let i = 0; i < 10; i++) {
    const raw = await client.readContract({ address, functionName, args });
    last = JSON.parse(raw);
    if (predicate(last)) return last;
    console.log(`  ${label}: not yet reflected, retrying (${i + 1}/10)...`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  return last;
}

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

try {
  log("1/6", "create_round");
  const dimensions = JSON.stringify([
    { label: "Verifiable Impact", weight: 60 },
    { label: "Code Quality", weight: 40 },
  ]);
  const createHash = await client.writeContract({
    address,
    functionName: "create_round",
    args: [
      "Lifecycle Test Round",
      "Automated end-to-end test of the full evaluation lifecycle.",
      "Score highly if the project demonstrably reduces integration friction and has active, well-tested code. Score lower if claims are unsubstantiated by the evidence provided.",
      dimensions,
    ],
    value: BigInt(0),
  });
  await waitAccepted(createHash, "create_round");

  // Use the last (most recently appended) round, not a title match -- prior
  // runs against this same contract can leave old "Lifecycle Test Round"
  // entries behind, and .find() would silently grab a stale one.
  const rounds = await readListWithRetry("list_rounds", [], "list_rounds");
  const round = rounds[rounds.length - 1];
  record("create_round", !!round, round ? `id=${round.id}` : "round not found after write");
  if (!round) throw new Error("aborting: round not created");

  log("2/6", "submit_project");
  const evidence = JSON.stringify([
    { label: "GitHub repo", url: "https://github.com/genlayerlabs/genlayer-js" },
    { label: "Docs", url: "https://docs.genlayer.com" },
  ]);
  const submitHash = await client.writeContract({
    address,
    functionName: "submit_project",
    args: [
      round.id,
      "Lifecycle Test Project",
      "A test submission created by scripts/lifecycle-test.mjs to verify the full evaluation flow end-to-end.",
      "Demonstrates the evaluation pipeline works from submission through challenge.",
      evidence,
    ],
    value: BigInt(0),
  });
  await waitAccepted(submitHash, "submit_project");

  const projects = await readListWithRetry("list_projects", [round.id], "list_projects");
  const project = projects[projects.length - 1];
  record("submit_project", !!project, project ? `id=${project.id}` : "project not found after write");
  if (!project) throw new Error("aborting: project not created");

  log("3/6", "evaluate_project (real LLM call via gl.eq_principle -- this is the slow step)");
  const evalHash = await client.writeContract({
    address,
    functionName: "evaluate_project",
    args: [project.id],
    value: BigInt(0),
  });
  await waitAccepted(evalHash, "evaluate_project");

  log("4/6", "get_evaluation (verify structure)");
  const evalRaw = await client.readContract({ address, functionName: "get_evaluation", args: [project.id] });
  const evaluation = JSON.parse(evalRaw);
  const hasRequiredFields =
    typeof evaluation.overall_score === "number" &&
    typeof evaluation.confidence === "number" &&
    Array.isArray(evaluation.dimension_scores) &&
    evaluation.dimension_scores.length === 2 &&
    typeof evaluation.reasoning === "string" &&
    evaluation.reasoning.length > 0 &&
    evaluation.challenged === false;
  record(
    "evaluate_project produces valid structured output",
    hasRequiredFields,
    `overall_score=${evaluation.overall_score}, confidence=${evaluation.confidence}, dimensions=${evaluation.dimension_scores.length}`,
  );
  console.log("  reasoning:", evaluation.reasoning);

  log("5/10", "challenge_evaluation (new evidence, real re-evaluation)");
  const newEvidence = JSON.stringify([
    { label: "Additional proof", url: "https://github.com/genlayerlabs" },
  ]);
  const challengeHash = await client.writeContract({
    address,
    functionName: "challenge_evaluation",
    args: [project.id, newEvidence],
    value: BigInt(0),
  });
  await waitAccepted(challengeHash, "challenge_evaluation");

  log("6/10", "get_evaluation after challenge (verify re-evaluation + challenged flag)");
  const afterEval = await readUntil(
    "get_evaluation",
    [project.id],
    (e) => e.challenged === true,
    "get_evaluation (challenged flag)",
  );
  record(
    "challenge_evaluation re-evaluates and marks challenged",
    afterEval.challenged === true && typeof afterEval.overall_score === "number",
    `overall_score=${afterEval.overall_score}, challenged=${afterEval.challenged}`,
  );

  log("7/10", "fund_round (send 0.01 GEN into the round's pool)");
  const fundAmount = BigInt(10) ** BigInt(16); // 0.01 GEN in wei
  const fundHash = await client.writeContract({
    address,
    functionName: "fund_round",
    args: [round.id],
    value: fundAmount,
  });
  await waitAccepted(fundHash, "fund_round");
  const fundedRound = await readUntil(
    "get_round",
    [round.id],
    (r) => r.pool === fundAmount.toString(),
    "get_round (pool)",
  );
  record(
    "fund_round",
    fundedRound.pool === fundAmount.toString(),
    `pool=${fundedRound.pool}`,
  );

  log("8/10", "close_round then compute_distribution");
  const closeHash = await client.writeContract({
    address,
    functionName: "close_round",
    args: [round.id],
    value: BigInt(0),
  });
  await waitAccepted(closeHash, "close_round");

  const distHash = await client.writeContract({
    address,
    functionName: "compute_distribution",
    args: [round.id],
    value: BigInt(0),
  });
  await waitAccepted(distHash, "compute_distribution");

  const payoutsRaw = await client.readContract({ address, functionName: "list_payouts", args: [round.id] });
  const payouts = JSON.parse(payoutsRaw);
  const myPayout = payouts.find((p) => p.project_id === project.id);
  record(
    "compute_distribution",
    !!myPayout && BigInt(myPayout.payout) === fundAmount,
    `payout=${myPayout?.payout} (sole evaluated project should get the full pool)`,
  );

  log(
    "9/10",
    "claim_payout (records entitlement on-chain -- does NOT transfer GEN; " +
      "see docs/ARCHITECTURE.md 'Known limitation')",
  );
  const claimHash = await client.writeContract({
    address,
    functionName: "claim_payout",
    args: [project.id],
    value: BigInt(0),
  });
  await waitAccepted(claimHash, "claim_payout");

  const projectAfterClaim = await readUntil(
    "get_project",
    [project.id],
    (p) => p.claimed === true,
    "get_project (claimed)",
  );
  record(
    "claim_payout marks claimed",
    projectAfterClaim.claimed === true,
    `claimed=${projectAfterClaim.claimed}`,
  );

  log("10/10", "claim_payout rejects a second claim");
  let doubleClaimRejected = false;
  try {
    const secondClaimHash = await client.writeContract({
      address,
      functionName: "claim_payout",
      args: [project.id],
      value: BigInt(0),
    });
    await waitAccepted(secondClaimHash, "second claim_payout");
  } catch {
    doubleClaimRejected = true;
  }
  record("double-claim is rejected", doubleClaimRejected);

  console.log("\n=== SUMMARY ===");
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} ${r.name}`);
  const allPassed = results.every((r) => r.pass);
  console.log(allPassed ? "\nAll lifecycle checks passed." : "\nSome checks FAILED.");
  process.exit(allPassed ? 0 : 1);
} catch (err) {
  console.error("\nFATAL:", err.message);
  console.log("\n=== SUMMARY (partial) ===");
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} ${r.name}`);
  process.exit(1);
}
