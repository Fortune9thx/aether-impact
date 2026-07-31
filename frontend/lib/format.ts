import { formatEther, parseEther } from "viem";

export function formatGen(wei: string | undefined): string {
  if (!wei || wei === "0") return "0";
  try {
    return formatEther(BigInt(wei));
  } catch {
    return "0";
  }
}

export function parseGen(amount: string): bigint {
  return parseEther(amount);
}
