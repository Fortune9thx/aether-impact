"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Payout } from "@/lib/types";
import { formatGen } from "@/lib/format";
import { writeContract } from "@/lib/genlayer";
import { useWallet } from "@/components/providers/WalletProvider";
import { ErrorState } from "@/components/ui/AsyncState";

export function ClaimPayoutRow({
  payout,
  onClaimed,
}: {
  payout: Payout;
  onClaimed: () => void;
}) {
  const { address, connect } = useWallet();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubmitter =
    !!address && address.toLowerCase() === payout.submitter.toLowerCase();

  async function handleClaim() {
    setError(null);
    if (!address) return;
    setClaiming(true);
    try {
      await writeContract(address, window.ethereum, "claim_payout", [
        payout.project_id,
      ]);
      onClaimed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim payout");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4">
      <div className="min-w-0">
        <h3 className="truncate font-serif text-lg text-text-primary">
          {payout.name}
        </h3>
        <p className="truncate font-mono text-xs text-text-secondary">
          {payout.submitter}
        </p>
        {error && (
          <div className="mt-2">
            <ErrorState message={error} />
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span className="font-mono text-sm text-accent">
          {formatGen(payout.payout)} GEN
        </span>

        {payout.claimed ? (
          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Claimed
          </span>
        ) : isSubmitter ? (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {claiming ? "Claiming..." : "Claim"}
          </button>
        ) : !address ? (
          <button
            onClick={connect}
            className="rounded-full border border-border bg-surface-elevated px-4 py-2 text-sm text-text-primary transition-colors duration-300 hover:border-accent/40"
          >
            Connect Wallet
          </button>
        ) : (
          <span className="text-xs text-text-secondary">Not yours</span>
        )}
      </div>
    </div>
  );
}
