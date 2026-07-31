"use client";

import { useState } from "react";
import { useWallet } from "@/components/providers/WalletProvider";

function truncate(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletButton({ className = "" }: { className?: string }) {
  const { address, connecting, error, availableWallets, connectWith, connect, disconnect } =
    useWallet();
  const [pickerOpen, setPickerOpen] = useState(false);

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

  function handleClick() {
    // Only offer a picker when there's an actual choice to make -- with one
    // or zero EIP-6963-announced wallets, connect() already does the right
    // thing (connect directly, or fall back to window.ethereum).
    if (availableWallets.length > 1) {
      setPickerOpen(true);
      return;
    }
    connect();
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleClick}
        disabled={connecting}
        className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-primary transition-colors duration-300 hover:border-accent/40 hover:bg-surface-elevated disabled:cursor-wait disabled:opacity-60"
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {pickerOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setPickerOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-border bg-surface p-2 shadow-lg">
            {availableWallets.map((wallet) => (
              <button
                key={wallet.rdns}
                onClick={() => {
                  setPickerOpen(false);
                  connectWith(wallet.rdns);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-text-primary transition-colors duration-300 hover:bg-surface-elevated"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={wallet.icon} alt="" className="h-5 w-5 shrink-0 rounded-full" />
                {wallet.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
