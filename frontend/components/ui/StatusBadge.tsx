import { RoundStatus } from "@/lib/types";

const statusConfig: Record<RoundStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "text-text-secondary bg-surface-elevated" },
  open: { label: "Open", className: "text-accent bg-accent-muted" },
  evaluating: { label: "Evaluating", className: "text-text-primary bg-surface-elevated" },
  closed: { label: "Closed", className: "text-text-secondary bg-surface-elevated" },
};

export function StatusBadge({ status }: { status: RoundStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
    >
      {status === "open" && (
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      )}
      {config.label}
    </span>
  );
}
