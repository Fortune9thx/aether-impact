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

export function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
