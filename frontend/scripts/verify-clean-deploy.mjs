// Read-only verification for a fresh deploy -- confirms the contract is
// reachable and genuinely empty, without writing any test data to it (unlike
// smoke.mjs, which creates a "Smoke Test Round" to prove writes work).
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

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
loadEnvFile(path.join(__dirname, "..", ".env.local"));

const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const client = createClient({ chain: testnetBradbury });

const raw = await client.readContract({ address, functionName: "list_rounds", args: [] });
const rounds = JSON.parse(raw);
console.log("contract:", address);
console.log("rounds:", rounds);
console.log(rounds.length === 0 ? "PASS: contract is reachable and empty." : "FAIL: contract has unexpected rounds.");
