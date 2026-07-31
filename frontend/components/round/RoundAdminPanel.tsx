"use client";

import { useState } from "react";
import { isRoundAdmin, Round } from "@/lib/types";
import { writeContract } from "@/lib/genlayer";
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
        <LifecycleAction
          round={round}
          onChanged={onChanged}
          action="close_round"
          label="Close round to submissions"
          hint="Submissions stop; evaluated projects can still be challenged until distribution."
        />
      )}

      {!round.distributed && round.status === "closed" && Number(round.pool) > 0 && (
        <LifecycleAction
          round={round}
          onChanged={onChanged}
          action="compute_distribution"
          label="Compute distribution"
          hint="Splits the funding pool proportionally across evaluated projects by final score -- irreversible."
        />
      )}

      <AdminManagement round={round} onChanged={onChanged} />
    </div>
  );
}

function LifecycleAction({
  round,
  onChanged,
  action,
  label,
  hint,
}: {
  round: Round;
  onChanged: () => void;
  action: "close_round" | "compute_distribution";
  label: string;
  hint: string;
}) {
  const { address } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setError(null);
    if (!address) return;
    setBusy(true);
    try {
      await writeContract(address, window.ethereum, action, [round.id]);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to run ${action}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-7">
      <p className="text-sm text-text-secondary">{hint}</p>
      <div className="mt-5">
        <button
          onClick={handleRun}
          disabled={busy}
          className="rounded-full border border-border bg-surface-elevated px-5 py-2.5 text-sm text-text-primary transition-colors duration-300 hover:border-accent/40 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Working..." : label}
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
  const { address } = useWallet();
  const [newAdmin, setNewAdmin] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    if (!address || !newAdmin.trim()) return;
    setBusy("add");
    try {
      await writeContract(address, window.ethereum, "add_admin", [round.id, newAdmin.trim()]);
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
      await writeContract(address, window.ethereum, "remove_admin", [round.id, admin]);
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
