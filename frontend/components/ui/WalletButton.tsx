"use client";

import { useWallet } from "@/components/providers/WalletProvider";

function truncate(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletButton({ className = "" }: { className?: string }) {
  const { address, connecting, error, connect, disconnect } = useWallet();

  if (address) {
    return (
      <button
        onClick={disconnect}
        title="Click to disconnect"
        className={`rounded-full border border-accent/40 bg-accent-muted px-4 py-2 text-sm text-text-primary transition-colors duration-300 hover:border-danger/40 ${className}`}
      >
        {truncate(address)}
      </button>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={connect}
        disabled={connecting}
        className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-primary transition-colors duration-300 hover:border-accent/40 hover:bg-surface-elevated disabled:cursor-wait disabled:opacity-60"
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
