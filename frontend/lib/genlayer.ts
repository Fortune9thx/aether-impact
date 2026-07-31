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
  return client.readContract({
    address,
    functionName,
    args: args as never,
  }) as Promise<T>;
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

  const hash = await client.writeContract({
    address,
    functionName,
    args: args as never,
    value: BigInt(0),
  });

  await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
  });

  return hash as string;
}
