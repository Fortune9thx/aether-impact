"use client";

import { useState } from "react";
import { isRoundAdmin, Round } from "@/lib/types";
import { writeContract } from "@/lib/genlayer";
import { parseGen } from "@/lib/format";
import { useWallet } from "@/components/providers/WalletProvider";
import { ErrorState } from "@/components/ui/AsyncState";

export function RoundAdminPanel({
  round,
  onChanged,
}: {
  round: Round;
  onChanged: () => void;
}) {
  const { address } = useWallet();

  if (!address) return null;
  if (!isRoundAdmin(round, address)) return null;

  return (
    <div className="flex flex-col gap-6">
      {!round.distributed && round.status === "open" && (
        <CloseRoundAction round={round} onChanged={onChanged} />
      )}

      {!round.distributed && round.status === "closed" && (
        <ComputeDistributionAction round={round} onChanged={onChanged} />
      )}

      <AdminManagement round={round} onChanged={onChanged} />
    </div>
  );
}

function CloseRoundAction({
  round,
  onChanged,
}: {
  round: Round;
  onChanged: () => void;
}) {
  const { address, provider } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setError(null);
    if (!address) return;
    setBusy(true);
    try {
      await writeContract(address, provider, "close_round", [round.id]);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close round");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-7">
      <p className="text-sm text-text-secondary">
        Submissions stop; evaluated projects can still be challenged until
        distribution.
      </p>
      <div className="mt-5">
        <button
          onClick={handleRun}
          disabled={busy}
          className="rounded-full border border-border bg-surface-elevated px-5 py-2.5 text-sm text-text-primary transition-colors duration-300 hover:border-accent/40 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Working..." : "Close round to submissions"}
        </button>
      </div>
      {error && (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      )}
    </div>
  );
}

function ComputeDistributionAction({
  round,
  onChanged,
}: {
  round: Round;
  onChanged: () => void;
}) {
  const { address, provider } = useWallet();
  const [pool, setPool] = useState("0.1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setError(null);
    if (!address) return;

    let poolWei: bigint;
    try {
      poolWei = parseGen(pool);
      if (poolWei <= BigInt(0)) throw new Error("Pool must be greater than 0");
    } catch {
      setError("Enter a valid GEN amount.");
      return;
    }

    setBusy(true);
    try {
      await writeContract(address, provider, "compute_distribution", [
        round.id,
        poolWei.toString(),
      ]);
      onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to compute distribution",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-7">
      <p className="text-sm text-text-secondary">
        Enter the total pool being distributed, split proportionally across
        evaluated projects by final score -- irreversible. GEN settlement is
        currently handled off-chain by you, the round admin, due to a known
        GenLayer Bradbury limitation on contract-initiated transfers; use the
        Rankings page to mark each entitlement paid once sent.
      </p>
      <div className="mt-5 flex items-center gap-3">
        <input
          type="number"
          min="0"
          step="0.01"
          value={pool}
          onChange={(e) => setPool(e.target.value)}
          className="w-32 rounded-xl border border-border bg-surface-elevated px-4 py-2.5 font-mono text-sm text-text-primary focus:border-accent/40 focus:outline-none"
        />
        <span className="text-sm text-text-secondary">GEN</span>
        <button
          onClick={handleRun}
          disabled={busy}
          className="ml-auto rounded-full border border-border bg-surface-elevated px-5 py-2.5 text-sm text-text-primary transition-colors duration-300 hover:border-accent/40 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Working..." : "Compute distribution"}
        </button>
      </div>
      {error && (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      )}
    </div>
  );
}

function AdminManagement({
  round,
  onChanged,
}: {
  round: Round;
  onChanged: () => void;
}) {
  const { address, provider } = useWallet();
  const [newAdmin, setNewAdmin] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    if (!address || !newAdmin.trim()) return;
    setBusy("add");
    try {
      await writeContract(address, provider, "add_admin", [round.id, newAdmin.trim()]);
      setNewAdmin("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add admin");
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(admin: string) {
    setError(null);
    if (!address) return;
    setBusy(admin);
    try {
      await writeContract(address, provider, "remove_admin", [round.id, admin]);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove admin");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-7">
      <h2 className="font-serif text-lg text-text-primary">Round Admins</h2>
      <div className="mt-4 flex flex-col gap-2">
        {round.admins.map((admin) => (
          <div
            key={admin}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-2.5"
          >
            <span className="truncate font-mono text-xs text-text-secondary">
              {admin}
              {admin.toLowerCase() === round.creator.toLowerCase() && (
                <span className="ml-2 text-accent">creator</span>
              )}
            </span>
            {admin.toLowerCase() !== round.creator.toLowerCase() && (
              <button
                onClick={() => handleRemove(admin)}
                disabled={busy === admin}
                className="shrink-0 text-xs text-text-secondary transition-colors duration-300 hover:text-danger disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <input
          value={newAdmin}
          onChange={(e) => setNewAdmin(e.target.value)}
          placeholder="0x... address"
          className="flex-1 rounded-xl border border-border bg-surface-elevated px-4 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent/40 focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={busy === "add" || !newAdmin.trim()}
          className="shrink-0 rounded-full border border-border bg-surface-elevated px-4 py-2.5 text-sm text-text-primary transition-colors duration-300 hover:border-accent/40 disabled:cursor-wait disabled:opacity-60"
        >
          {busy === "add" ? "Adding..." : "Add Admin"}
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      )}
    </div>
  );
}
