import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}
loadEnvFile(path.join(__dirname, "..", ".env.deploy"));
loadEnvFile(path.join(__dirname, "..", ".env.local"));

const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const account = createAccount(process.env.DEPLOYER_PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });

async function waitAccepted(hash, label) {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const tx = await client.getTransaction({ hash });
    console.log(`  ${label} poll ${i + 1}: status=${tx.status}`);
    if (tx.status === 5 || tx.status === 7) return tx;
    if (tx.status === 6 || tx.status === 8) throw new Error(`${label} failed: ${tx.status}`);
  }
  throw new Error(`${label} timed out`);
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

console.log("1. create_round");
const dims = JSON.stringify([{ label: "Quality", weight: 100 }]);
let hash = await client.writeContract({
  address, functionName: "create_round",
  args: ["Payout Check Round", "Isolated payout verification", "Score based on quality", dims],
  value: BigInt(0),
});
await waitAccepted(hash, "create_round");
const rounds = await readListWithRetry("list_rounds", [], "list_rounds");
const round = rounds[rounds.length - 1];
console.log("   round:", round.id, "creator:", round.creator, "admins:", round.admins);

console.log("2. submit_project");
const ev = JSON.stringify([{ label: "repo", url: "https://github.com/genlayerlabs/genlayer-js" }]);
hash = await client.writeContract({
  address, functionName: "submit_project",
  args: [round.id, "Payout Check Project", "test", "test impact", ev],
  value: BigInt(0),
});
await waitAccepted(hash, "submit_project");
const projects = await readListWithRetry("list_projects", [round.id], "list_projects");
const project = projects[projects.length - 1];
console.log("   project:", project.id, "submitter:", project.submitter);

console.log("3. evaluate_project");
hash = await client.writeContract({ address, functionName: "evaluate_project", args: [project.id], value: BigInt(0) });
await waitAccepted(hash, "evaluate_project");

console.log("4. fund_round (0.02 GEN)");
const fundAmount = BigInt(2) * BigInt(10) ** BigInt(16);
hash = await client.writeContract({ address, functionName: "fund_round", args: [round.id], value: fundAmount });
await waitAccepted(hash, "fund_round");

console.log("5. close_round");
hash = await client.writeContract({ address, functionName: "close_round", args: [round.id], value: BigInt(0) });
await waitAccepted(hash, "close_round");

console.log("6. compute_distribution");
hash = await client.writeContract({ address, functionName: "compute_distribution", args: [round.id], value: BigInt(0) });
await waitAccepted(hash, "compute_distribution");

const contractBalanceBefore = await client.getBalance({ address });
const submitterBalanceBefore = await client.getBalance({ address: account.address });
console.log("Before claim:");
console.log("  contract balance:", contractBalanceBefore.toString());
console.log("  submitter (deployer) balance:", submitterBalanceBefore.toString());

console.log("7. claim_payout");
hash = await client.writeContract({ address, functionName: "claim_payout", args: [project.id], value: BigInt(0) });
await waitAccepted(hash, "claim_payout");

const contractBalanceAfter = await client.getBalance({ address });
const submitterBalanceAfter = await client.getBalance({ address: account.address });
console.log("After claim:");
console.log("  contract balance:", contractBalanceAfter.toString());
console.log("  submitter (deployer) balance:", submitterBalanceAfter.toString());

const contractDelta = contractBalanceBefore - contractBalanceAfter;
const submitterDelta = submitterBalanceAfter - submitterBalanceBefore;
console.log("\nContract balance decreased by:", contractDelta.toString());
console.log("Submitter balance changed by (net of gas):", submitterDelta.toString());

if (contractDelta === fundAmount) {
  console.log("\nPASS: contract balance decreased by exactly the payout amount.");
} else {
  console.log("\nFAIL: contract balance did not decrease by the expected payout amount.");
  process.exit(1);
}
