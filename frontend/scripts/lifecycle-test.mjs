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

  const roundsRaw = await client.readContract({ address, functionName: "list_rounds", args: [] });
  const rounds = JSON.parse(roundsRaw);
  const round = rounds.find((r) => r.title === "Lifecycle Test Round");
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

  const projectsRaw = await client.readContract({ address, functionName: "list_projects", args: [round.id] });
  const projects = JSON.parse(projectsRaw);
  const project = projects.find((p) => p.name === "Lifecycle Test Project");
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

  log("5/6", "challenge_evaluation (new evidence, real re-evaluation)");
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

  log("6/6", "get_evaluation after challenge (verify re-evaluation + challenged flag)");
  const afterRaw = await client.readContract({ address, functionName: "get_evaluation", args: [project.id] });
  const afterEval = JSON.parse(afterRaw);
  record(
    "challenge_evaluation re-evaluates and marks challenged",
    afterEval.challenged === true && typeof afterEval.overall_score === "number",
    `overall_score=${afterEval.overall_score}, challenged=${afterEval.challenged}`,
  );

  log("cleanup", "close_round so this test data doesn't linger as an open round");
  const closeHash = await client.writeContract({
    address,
    functionName: "close_round",
    args: [round.id],
    value: BigInt(0),
  });
  await waitAccepted(closeHash, "close_round");
  const closedRaw = await client.readContract({ address, functionName: "get_round", args: [round.id] });
  record("close_round", JSON.parse(closedRaw).status === "closed");

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
