"use client";

import { useState } from "react";
import { formatGen, parseGen } from "@/lib/format";
import { writeContract } from "@/lib/genlayer";
import { useWallet } from "@/components/providers/WalletProvider";
import { Round } from "@/lib/types";
import { ErrorState } from "@/components/ui/AsyncState";
import { WalletButton } from "@/components/ui/WalletButton";

export function FundRoundPanel({
  round,
  onFunded,
}: {
  round: Round;
  onFunded: () => void;
}) {
  const { address } = useWallet();
  const [amount, setAmount] = useState("0.1");
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFund() {
    setError(null);
    if (!address) {
      setError("Connect your wallet to fund this round.");
      return;
    }

    let value: bigint;
    try {
      value = parseGen(amount);
      if (value <= BigInt(0)) throw new Error("Amount must be greater than 0");
    } catch {
      setError("Enter a valid GEN amount.");
      return;
    }

    setFunding(true);
    try {
      await writeContract(
        address,
        window.ethereum,
        "fund_round",
        [round.id],
        value,
      );
      onFunded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fund round");
    } finally {
      setFunding(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-7">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-text-primary">Funding Pool</h2>
        <span className="font-mono text-sm text-accent">
          {formatGen(round.pool)} GEN
        </span>
      </div>

      {round.distributed ? (
        <p className="mt-3 text-sm text-text-secondary">
          This round has already computed its distribution.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-text-secondary">
            Anyone can add GEN to this round&apos;s pool. Once the round is
            closed, distribution splits it proportionally across evaluated
            projects by final score. Fund settlement is currently handled
            off-chain.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32 rounded-xl border border-border bg-surface-elevated px-4 py-2.5 font-mono text-sm text-text-primary focus:border-accent/40 focus:outline-none"
            />
            <span className="text-sm text-text-secondary">GEN</span>

            {address ? (
              <button
                onClick={handleFund}
                disabled={funding}
                className="ml-auto rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {funding ? "Funding..." : "Fund Round"}
              </button>
            ) : (
              <div className="ml-auto">
                <WalletButton />
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4">
              <ErrorState message={error} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
