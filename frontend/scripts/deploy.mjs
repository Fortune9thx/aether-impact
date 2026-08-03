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

const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!privateKey) {
  console.error(
    "Missing DEPLOYER_PRIVATE_KEY. Create frontend/.env.deploy with:\n" +
      "  DEPLOYER_PRIVATE_KEY=0x...\n" +
      "(this file is gitignored -- never commit a private key)",
  );
  process.exit(1);
}

const networkName = process.env.GENLAYER_NETWORK ?? "testnet-bradbury";
const chain = NETWORKS[networkName];
if (!chain) {
  console.error(
    `Unknown GENLAYER_NETWORK "${networkName}". Valid: ${Object.keys(NETWORKS).join(", ")}`,
  );
  process.exit(1);
}

const account = createAccount(privateKey);
const client = createClient({ chain, account });

// Known failure mode under Bradbury congestion: the node's eth_estimateGas
// call fails ("execution reverted" / backpressure), and genlayer-js then
// falls back to a hardcoded 200k gas limit that is too small for this
// contract, so the deploy dies with "intrinsic gas too low". The fallback
// is not interceptable from outside the library (createClient's internal
// action layers close over intermediate client copies, so patching the
// returned client's estimateTransactionGas has no effect on the deploy
// path). The only remedy is retrying until the node answers the
// estimation call; if you see "Gas estimation failed, using default
// 200_000" in the output, the attempt will fail -- rerun it.

console.log(`Deployer address: ${account.address}`);
console.log(`Network: ${networkName} (${chain.name})`);

const contractPath = path.join(__dirname, "..", "..", "contracts", "ImpactEvaluator.py");
const code = readFileSync(contractPath, "utf-8");
console.log(`Contract: ${contractPath} (${code.length} bytes)`);

console.log("Submitting deploy transaction...");
const hash = await client.deployContract({ account, code });
console.log(`Deploy tx hash: ${hash}`);

console.log("Waiting for the transaction to be accepted (this polls, not a single await)...");
let deployedAddress = null;
for (let attempt = 0; attempt < 40; attempt++) {
  await new Promise((r) => setTimeout(r, 3000));
  let tx;
  try {
    tx = await client.getTransaction({ hash });
  } catch (err) {
    console.log(`  attempt ${attempt + 1}: not found yet (${err.message})`);
    continue;
  }

  console.log(`  attempt ${attempt + 1}: status = ${tx.status}`);
  if (tx.recipient) deployedAddress = tx.recipient;

  if (tx.status === "ACCEPTED" || tx.status === "FINALIZED") {
    break;
  }
  if (tx.status === "UNDETERMINED" || tx.status === "CANCELED") {
    console.error(`Deployment did not succeed: status ${tx.status}`);
    process.exit(1);
  }
}

if (!deployedAddress) {
  console.error(
    "Could not determine the deployed contract address after polling. " +
      "Check the tx hash above manually via the GenLayer explorer.",
  );
  process.exit(1);
}

console.log("\nDeployed successfully.");
console.log(`Contract address: ${deployedAddress}`);
console.log(
  `\nSet this in frontend/.env.local:\n  NEXT_PUBLIC_CONTRACT_ADDRESS=${deployedAddress}\n  NEXT_PUBLIC_GENLAYER_NETWORK=${networkName}`,
);
