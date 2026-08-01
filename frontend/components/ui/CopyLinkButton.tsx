"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export function CopyLinkButton({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard access denied -- nothing meaningful to recover here
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-text-primary transition-colors duration-450 hover:border-accent/40 ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-accent" />
          Copied
        </>
      ) : (
        <>
          <Link2 className="h-3.5 w-3.5" />
          Share
        </>
      )}
    </button>
  );
}
