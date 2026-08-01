"use client";

import { motion } from "framer-motion";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      className={`inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

// A calm inline pending row: spinner + status text, used anywhere a write is
// in flight and the wait can be long (LLM evaluation, consensus, appeals).
export function PendingStatus({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-2">
      <Spinner />
      {text}
    </span>
  );
}
