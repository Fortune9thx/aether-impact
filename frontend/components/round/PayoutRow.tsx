"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { isRoundAdmin, Payout, Round } from "@/lib/types";
import { formatGen } from "@/lib/format";
import { writeContract } from "@/lib/genlayer";
import { useWallet } from "@/components/providers/WalletProvider";
import { ErrorState } from "@/components/ui/AsyncState";
import { PendingStatus } from "@/components/ui/Spinner";

export function PayoutRow({
  payout,
  round,
  onChanged,
}: {
  payout: Payout;
  round: Round;
  onChanged: () => void;
}) {
  const { address, provider } = useWallet();
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canMarkPaid = isRoundAdmin(round, address);

  async function handleMarkPaid() {
    setError(null);
    if (!address) return;
    setMarking(true);
    try {
      await writeContract(address, provider, "mark_paid", [
        payout.project_id,
      ]);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as paid");
    } finally {
      setMarking(false);
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

        {payout.paid ? (
          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Paid
          </span>
        ) : canMarkPaid ? (
          <button
            onClick={handleMarkPaid}
            disabled={marking}
            title="Marks this entitlement as settled after paying the submitter off-chain."
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {marking ? <PendingStatus text="Marking..." /> : "Mark Paid"}
          </button>
        ) : (
          <span className="text-xs text-text-secondary">Awaiting payout</span>
        )}
      </div>
    </div>
  );
}
