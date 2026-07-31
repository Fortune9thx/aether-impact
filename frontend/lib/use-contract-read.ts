"use client";

import { useCallback, useEffect, useState } from "react";
import { isContractConfigured, readContract } from "@/lib/genlayer";

type State<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useContractRead<T>(
  functionName: string,
  args: unknown[],
  deps: unknown[] = [],
) {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    if (!isContractConfigured()) {
      setState({ data: null, loading: false, error: "Contract not configured" });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const raw = await readContract<string>(functionName, args);
      const data = (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to read from contract",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}
