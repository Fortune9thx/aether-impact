"use client";

import { isContractConfigured } from "@/lib/genlayer";

export function ContractStatusBanner() {
  if (isContractConfigured()) return null;

  return (
    <div className="border-b border-danger/30 bg-danger/10 px-6 py-2 text-center text-xs text-danger">
      NEXT_PUBLIC_CONTRACT_ADDRESS is not set. Deploy ImpactEvaluator.py and
      configure .env.local. All reads and writes will fail until then.
    </div>
  );
}
