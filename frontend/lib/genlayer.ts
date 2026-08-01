import { createClient } from "genlayer-js";
import { localnet, studionet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const NETWORKS = {
  localnet,
  studionet,
  "testnet-asimov": testnetAsimov,
  "testnet-bradbury": testnetBradbury,
} as const;

export type NetworkName = keyof typeof NETWORKS;

const networkName = (process.env.NEXT_PUBLIC_GENLAYER_NETWORK ??
  "testnet-bradbury") as NetworkName;

export const activeChain = NETWORKS[networkName] ?? testnetBradbury;

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

export function isContractConfigured(): boolean {
  return CONTRACT_ADDRESS.length > 0;
}

function requireContractAddress(): `0x${string}` {
  if (!isContractConfigured()) {
    throw new Error(
      "NEXT_PUBLIC_CONTRACT_ADDRESS is not set. Deploy ImpactEvaluator.py and set the address in .env.local before using the app.",
    );
  }
  return CONTRACT_ADDRESS as `0x${string}`;
}

// GenVM errors surface as a massive stringified struct with the actual Python
// exception buried inside a Stderr traceback. Extract just the exception
// message so the UI never shows a raw stack trace / bytecode dump to a user.
function cleanContractError(err: unknown): Error {
  // Always log the full, unflattened error to the console. Messages like
  // viem's generic "An internal error was received. Details: X" collapse
  // everything the wallet/RPC actually returned (code, cause, data) into one
  // opaque string -- the only way to see what's really underneath is the
  // full object, which only exists in devtools, not in the thrown message.
  console.error("[Aether Impact] raw contract/transaction error:", err);

  const raw = err instanceof Error ? err.message : String(err);
  const errRecord = err as Record<string, unknown> | null;

  // A bare, structureless "Transaction failed" (or similar) from the wallet
  // or RPC layer carries a numeric JSON-RPC error code even when its message
  // has nothing useful. Surface that code plus any cause chain instead of
  // silently passing the unhelpful text straight through.
  const rpcCode = (errRecord?.code ?? (errRecord?.cause as Record<string, unknown> | undefined)?.code) as
    | number
    | undefined;
  if (rpcCode !== undefined && raw.length < 120 && !raw.includes("ValueError")) {
    return new Error(
      `The transaction could not be completed (RPC error ${rpcCode}: "${raw.replace(/^.*Details:\s*/i, "").replace(/\s*Version:.*$/i, "").trim()}"). This is usually transient network/RPC unreliability -- please retry. Check the browser console for full details.`,
    );
  }

  for (const marker of ["ValueError: ", "KeyError: ", "TypeError: ", "Exception: "]) {
    const idx = raw.lastIndexOf(marker);
    if (idx === -1) continue;

    let msg = raw.slice(idx + marker.length);
    // The GenVM Stderr traceback embeds literal "\n" escape sequences as
    // text (not real newline characters) -- cut the message off there.
    const cutIdx = msg.indexOf("\\n");
    if (cutIdx !== -1) msg = msg.slice(0, cutIdx);
    msg = msg.trim();
    if (msg) return new Error(msg);
  }

  if (raw.includes("Missing or invalid parameters")) {
    return new Error("That item doesn't exist.");
  }

  if (raw.length > 300) {
    return new Error("Something went wrong talking to the contract. Please try again.");
  }

  return err instanceof Error ? err : new Error(raw);
}

// Tokens that show up as structural noise inside GenVM's binary calldata
// encoding of a UserError (frame/module metadata, not the message itself).
const CALLDATA_NOISE_TOKENS = new Set([
  "kind",
  "data",
  "events",
  "fingerprint",
  "frame",
  "func",
  "module_name",
  "python",
  "memories",
  "storage_changes",
  "UserError",
]);

// A FINISHED_WITH_ERROR transaction's actual message is embedded inside a
// binary (msgpack-like) calldata blob returned by debugTraceTransaction --
// there is no public decoder for it in genlayer-js. Extract the longest
// printable-ASCII run that isn't one of the known structural tokens; this is
// a heuristic, not a real decode, so it always has a safe generic fallback.
function extractMessageFromReturnData(returnDataHex: string): string | null {
  const hex = returnDataHex.startsWith("0x") ? returnDataHex.slice(2) : returnDataHex;
  if (hex.length === 0 || hex.length % 2 !== 0) return null;

  // Decode as raw latin1 bytes (this runs in the browser, so no Buffer) --
  // every byte maps 1:1 to a char code, which is all the printable-ASCII
  // regex below needs.
  let text = "";
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) return null;
    text += String.fromCharCode(byte);
  }

  const candidates = text.match(/[\x20-\x7e]{6,}/g) ?? [];
  const filtered = candidates.filter((c) => !CALLDATA_NOISE_TOKENS.has(c.trim()));
  if (filtered.length === 0) return null;

  filtered.sort((a, b) => b.length - a.length);
  return filtered[0].trim();
}

let readClient: ReturnType<typeof createClient> | null = null;

export function getReadClient() {
  if (!readClient) {
    readClient = createClient({ chain: activeChain });
  }
  return readClient;
}

export async function readContract<T = unknown>(
  functionName: string,
  args: unknown[] = [],
): Promise<T> {
  const address = requireContractAddress();
  const client = getReadClient();
  try {
    return (await client.readContract({
      address,
      functionName,
      args: args as never,
    })) as T;
  } catch (err) {
    throw cleanContractError(err);
  }
}

// Lightweight, best-effort status narration for the two appeal states --
// genlayer-js's waitForTransactionReceipt blocks until a decided terminal
// state with no visibility into what's happening in between, so this polls
// getTransaction in parallel purely to surface "Appeal in progress..." to
// the caller instead of a generic spinner. Never throws; a failure here
// just means the caller doesn't get an appeal notice, the main wait is
// unaffected.
function watchForAppeal(
  client: ReturnType<typeof createClient>,
  hash: string,
  onStatus?: (status: string) => void,
): () => void {
  if (!onStatus) return () => {};

  let stopped = false;
  const interval = setInterval(() => {
    client
      .getTransaction({ hash: hash as never })
      .then((tx) => {
        if (stopped) return;
        const statusName = (tx as Record<string, unknown>).status_name as string | undefined;
        if (statusName === "APPEAL_REVEALING" || statusName === "APPEAL_COMMITTING") {
          onStatus("Appeal in progress...");
        }
      })
      .catch(() => {
        // best-effort only
      });
  }, 2000);

  return () => {
    stopped = true;
    clearInterval(interval);
  };
}

export async function writeContract(
  account: `0x${string}`,
  provider: unknown,
  functionName: string,
  args: unknown[] = [],
  value: bigint = BigInt(0),
  onStatus?: (status: string) => void,
): Promise<string> {
  const address = requireContractAddress();
  const client = createClient({
    chain: activeChain,
    account,
    provider: provider as never,
  });

  let stopWatching = () => {};
  try {
    const hash = await client.writeContract({
      address,
      functionName,
      args: args as never,
      value,
    });

    stopWatching = watchForAppeal(client, hash, onStatus);

    let receipt: Awaited<ReturnType<typeof client.waitForTransactionReceipt>>;
    try {
      receipt = await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
      });
    } catch (waitErr) {
      // waitForTransactionReceipt gives up after its own fixed retry budget
      // and throws a timeout -- but the transaction can still be sitting in
      // a slow consensus rotation and succeed moments later. Confirmed
      // directly: a transaction reported as "timed out" by this call was
      // ACCEPTED/FINISHED_WITH_RETURN on-chain seconds after the UI showed
      // a failure. Before giving up, poll the real status ourselves for a
      // while longer rather than report a false failure on a write that may
      // still land.
      const message = waitErr instanceof Error ? waitErr.message : String(waitErr);
      if (!message.toLowerCase().includes("timed out")) throw waitErr;

      const DECIDED_STATUSES = new Set([
        "ACCEPTED",
        "FINALIZED",
        "UNDETERMINED",
        "CANCELED",
        "VALIDATORS_TIMEOUT",
        "LEADER_TIMEOUT",
      ]);
      let confirmed: Record<string, unknown> | null = null;
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const tx = (await client.getTransaction({ hash: hash as never })) as Record<string, unknown>;
        const statusName = (tx.status_name ?? tx.statusName) as string | undefined;
        if (statusName && DECIDED_STATUSES.has(statusName)) {
          confirmed = tx;
          break;
        }
      }
      if (!confirmed) throw waitErr;
      receipt = confirmed as never;
    }

    // waitForTransactionReceipt resolves on ANY "decided" terminal state --
    // ACCEPTED, but also UNDETERMINED / LEADER_TIMEOUT / VALIDATORS_TIMEOUT /
    // CANCELED. Those are not failures genlayer-js throws on, but they ARE
    // failures: the write did not apply. Check the real status explicitly so
    // the UI never reports success when nothing was actually stored.
    //
    // The `status` field on the receipt is numeric at runtime (e.g. 5), not
    // the string enum value its own type declares -- the reliable string is
    // `status_name` (snake_case; the camelCase `statusName` the types
    // promise is undefined at runtime). Verified directly against a live
    // transaction before relying on it here.
    const asRecord = receipt as Record<string, unknown>;
    const finalStatus = (asRecord.status_name ?? asRecord.statusName) as string | undefined;
    if (finalStatus && finalStatus !== "ACCEPTED" && finalStatus !== "FINALIZED") {
      if (finalStatus === "UNDETERMINED") {
        throw new Error(
          "The GenLayer validators could not reach consensus on this evaluation. This can happen occasionally with subjective judgments -- please try again.",
        );
      }
      throw new Error(`Transaction did not succeed (status: ${finalStatus}). Please try again.`);
    }

    // Reaching consensus (ACCEPTED/FINALIZED) only means validators agreed on
    // the outcome -- it does NOT mean the contract call itself succeeded. A
    // validation error inside the method (e.g. raising gl.vm.UserError) still
    // reaches ACCEPTED, but txExecutionResultName reports FINISHED_WITH_ERROR.
    // Confirmed directly: without this check, every rejected write silently
    // reported success to the UI.
    const executionResult = asRecord.txExecutionResultName as string | undefined;
    if (executionResult === "FINISHED_WITH_ERROR") {
      let message = "The contract rejected this action. Please check your input and try again.";
      try {
        const trace = await client.debugTraceTransaction({ hash });
        const extracted = extractMessageFromReturnData(trace.return_data);
        if (extracted) message = extracted;
      } catch {
        // best-effort only -- fall back to the generic message above
      }
      throw new Error(message);
    }

    return hash as string;
  } catch (err) {
    throw cleanContractError(err);
  } finally {
    stopWatching();
  }
}
