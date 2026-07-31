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
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
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

const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const networkName = process.env.GENLAYER_NETWORK ?? process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "testnet-bradbury";

if (!address) {
  console.error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS in frontend/.env.local");
  process.exit(1);
}
if (!privateKey) {
  console.error("Missing DEPLOYER_PRIVATE_KEY in frontend/.env.deploy");
  process.exit(1);
}

const chain = NETWORKS[networkName];
const account = createAccount(privateKey);
const client = createClient({ chain, account });

console.log(`Testing contract at ${address} on ${networkName}...`);

console.log("\n1. Reading list_rounds (should be an empty array on a fresh deploy)...");
const roundsRaw = await client.readContract({
  address,
  functionName: "list_rounds",
  args: [],
});
console.log("   list_rounds ->", roundsRaw);
JSON.parse(roundsRaw);
console.log("   OK: valid JSON, contract storage is readable.");

console.log("\n2. Submitting create_round to confirm a write round-trips...");
const dimensions = JSON.stringify([
  { label: "Smoke Test Dimension", weight: 100 },
]);
const hash = await client.writeContract({
  address,
  functionName: "create_round",
  args: [
    "Smoke Test Round",
    "Created by scripts/smoke.mjs to verify deploy",
    "N/A - smoke test only",
    dimensions,
  ],
  value: BigInt(0),
});
console.log("   tx hash:", hash);

for (let attempt = 0; attempt < 40; attempt++) {
  await new Promise((r) => setTimeout(r, 3000));
  const tx = await client.getTransaction({ hash });
  console.log(`   attempt ${attempt + 1}: status = ${tx.status}`);
  if (tx.status === "ACCEPTED" || tx.status === "FINALIZED") break;
  if (tx.status === "UNDETERMINED" || tx.status === "CANCELED") {
    console.error("   Write failed:", tx.status);
    process.exit(1);
  }
}

console.log("\n3. Reading list_rounds again to confirm the write persisted and is readable...");
const roundsAfterRaw = await client.readContract({
  address,
  functionName: "list_rounds",
  args: [],
});
const roundsAfter = JSON.parse(roundsAfterRaw);
console.log("   rounds:", roundsAfter.map((r) => r.title));

if (roundsAfter.length === 0) {
  console.error("\nFAILED: round was written but list_rounds still returns empty.");
  process.exit(1);
}

console.log("\nSmoke test passed: deploy, write, and read all confirmed working.");
