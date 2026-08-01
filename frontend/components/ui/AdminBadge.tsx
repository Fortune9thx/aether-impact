import { ShieldCheck } from "lucide-react";

export function AdminBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-muted px-3 py-1 text-xs font-medium text-accent ${className}`}
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      Round Admin
    </span>
  );
}
