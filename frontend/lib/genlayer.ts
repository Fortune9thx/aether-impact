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
  const raw = err instanceof Error ? err.message : String(err);

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

export async function writeContract(
  account: `0x${string}`,
  provider: unknown,
  functionName: string,
  args: unknown[] = [],
): Promise<string> {
  const address = requireContractAddress();
  const client = createClient({
    chain: activeChain,
    account,
    provider: provider as never,
  });

  try {
    const hash = await client.writeContract({
      address,
      functionName,
      args: args as never,
      value: BigInt(0),
    });

    const receipt = await client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.ACCEPTED,
    });

    // waitForTransactionReceipt resolves on ANY "decided" terminal state --
    // ACCEPTED, but also UNDETERMINED / LEADER_TIMEOUT / VALIDATORS_TIMEOUT /
    // CANCELED. Those are not failures genlayer-js throws on, but they ARE
    // failures: the write did not apply. Check the real status explicitly so
    // the UI never reports success when nothing was actually stored.
    const finalStatus = (receipt as { status?: string })?.status;
    if (finalStatus && finalStatus !== "ACCEPTED" && finalStatus !== "FINALIZED") {
      if (finalStatus === "UNDETERMINED") {
        throw new Error(
          "The GenLayer validators could not reach consensus on this evaluation. This can happen occasionally with subjective judgments -- please try again.",
        );
      }
      throw new Error(`Transaction did not succeed (status: ${finalStatus}). Please try again.`);
    }

    return hash as string;
  } catch (err) {
    throw cleanContractError(err);
  }
}
