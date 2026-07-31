"use client";

import { useState } from "react";
import { Round } from "@/lib/types";
import { writeContract } from "@/lib/genlayer";
import { useWallet } from "@/components/providers/WalletProvider";
import { ErrorState } from "@/components/ui/AsyncState";
import { WalletButton } from "@/components/ui/WalletButton";

export function RoundAdminPanel({
  round,
  onChanged,
}: {
  round: Round;
  onChanged: () => void;
}) {
  const { address } = useWallet();
  const [busy, setBusy] = useState<"close" | "distribute" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (round.distributed) return null;
  if (round.status === "open") {
    return (
      <RoundAdminAction
        address={address}
        busy={busy === "close"}
        error={error}
        label="Close round to submissions"
        hint="Only the round creator can close it. Submissions stop; evaluated projects can still be challenged until distribution."
        onRun={async () => {
          setError(null);
          if (!address) return setError("Connect your wallet first.");
          setBusy("close");
          try {
            await writeContract(address, window.ethereum, "close_round", [round.id]);
            onChanged();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to close round");
          } finally {
            setBusy(null);
          }
        }}
      />
    );
  }

  if (Number(round.pool) === 0) return null;

  return (
    <RoundAdminAction
      address={address}
      busy={busy === "distribute"}
      error={error}
      label="Compute distribution"
      hint="Only the round creator can trigger this. Splits the funding pool proportionally across evaluated projects by final score -- irreversible."
      onRun={async () => {
        setError(null);
        if (!address) return setError("Connect your wallet first.");
        setBusy("distribute");
        try {
          await writeContract(address, window.ethereum, "compute_distribution", [round.id]);
          onChanged();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to compute distribution");
        } finally {
          setBusy(null);
        }
      }}
    />
  );
}

function RoundAdminAction({
  address,
  busy,
  error,
  label,
  hint,
  onRun,
}: {
  address: `0x${string}` | null;
  busy: boolean;
  error: string | null;
  label: string;
  hint: string;
  onRun: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-7">
      <p className="text-sm text-text-secondary">{hint}</p>
      <div className="mt-5">
        {address ? (
          <button
            onClick={onRun}
            disabled={busy}
            className="rounded-full border border-border bg-surface-elevated px-5 py-2.5 text-sm text-text-primary transition-colors duration-300 hover:border-accent/40 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Working..." : label}
          </button>
        ) : (
          <WalletButton />
        )}
      </div>
      {error && (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      )}
    </div>
  );
}
