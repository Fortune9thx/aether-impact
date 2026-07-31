"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { activeChain } from "@/lib/genlayer";

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

// EIP-6963: Multi Injected Provider Discovery. Every EVM wallet extension
// (MetaMask, OKX Wallet, Rabby, Coinbase Wallet, Rainbow, etc.) that supports
// this standard announces itself independently, instead of every wallet
// fighting to own the single `window.ethereum` slot. Without this, only
// whichever wallet happened to inject last (or first) is reachable.
type EIP6963ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

type EIP6963ProviderDetail = {
  info: EIP6963ProviderInfo;
  provider: EthereumProvider;
};

type EIP6963AnnounceEvent = CustomEvent<EIP6963ProviderDetail>;

const CONNECT_NETWORK_NAME: Record<string, string> = {
  localnet: "localnet",
  studionet: "studionet",
  "testnet-asimov": "testnetAsimov",
  "testnet-bradbury": "testnetBradbury",
};

type WalletContextValue = {
  address: `0x${string}` | null;
  connecting: boolean;
  error: string | null;
  // The actual connected wallet's EIP-1193 provider -- use this for every
  // write, never window.ethereum directly. With multiple wallet extensions
  // installed, window.ethereum may not be the one the user picked/connected.
  provider: EthereumProvider | null;
  // EIP-6963-announced wallets available to pick from (MetaMask, OKX, Rabby, etc).
  availableWallets: EIP6963ProviderInfo[];
  // Connects with a specific announced wallet by its rdns. If only one wallet
  // is available (or none announce via EIP-6963), falls back to window.ethereum.
  connectWith: (rdns: string) => Promise<void>;
  // Convenience: connects with the only available wallet, or window.ethereum
  // if none announced -- callers that don't need a picker can just call this.
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Map<string, EIP6963ProviderDetail>>(new Map());
  const [provider, setProvider] = useState<EthereumProvider | null>(null);

  useEffect(() => {
    function handleAnnouncement(event: Event) {
      const detail = (event as EIP6963AnnounceEvent).detail;
      if (!detail?.info?.rdns) return;
      setWallets((prev) => {
        if (prev.has(detail.info.rdns)) return prev;
        const next = new Map(prev);
        next.set(detail.info.rdns, detail);
        return next;
      });
    }

    window.addEventListener("eip6963:announceProvider", handleAnnouncement);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnouncement);
    };
  }, []);

  useEffect(() => {
    if (!provider?.on) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAddress((accounts?.[0] as `0x${string}` | undefined) ?? null);
    };

    provider.on("accountsChanged", handleAccountsChanged);
    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, [provider]);

  const connectWithProvider = useCallback(async (provider: EthereumProvider) => {
    setConnecting(true);
    setError(null);

    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];

      const account = accounts[0] as `0x${string}` | undefined;
      if (!account) {
        throw new Error("No account returned by wallet");
      }

      const genlayerNetwork =
        CONNECT_NETWORK_NAME[
          process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "testnet-bradbury"
        ] ?? "testnetBradbury";

      const { createClient } = await import("genlayer-js");
      const client = createClient({
        chain: activeChain,
        account,
        provider: provider as never,
      });
      await client.connect(genlayerNetwork as never);

      setProvider(provider);
      setAddress(account);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const connectWith = useCallback(
    async (rdns: string) => {
      const detail = wallets.get(rdns);
      if (!detail) {
        setError("That wallet is no longer available.");
        return;
      }
      await connectWithProvider(detail.provider);
    },
    [wallets, connectWithProvider],
  );

  const connect = useCallback(async () => {
    const detected = Array.from(wallets.values());
    if (detected.length > 0) {
      await connectWithProvider(detected[0].provider);
      return;
    }
    if (!window.ethereum) {
      setError("No wallet found. Install MetaMask, OKX Wallet, Rabby, or another EVM wallet to connect.");
      return;
    }
    await connectWithProvider(window.ethereum);
  }, [wallets, connectWithProvider]);

  const disconnect = useCallback(() => {
    setProvider(null);
    setAddress(null);
    setError(null);
  }, []);

  const availableWallets = useMemo(() => Array.from(wallets.values()).map((d) => d.info), [wallets]);

  const value = useMemo(
    () => ({ address, connecting, error, provider, availableWallets, connectWith, connect, disconnect }),
    [address, connecting, error, provider, availableWallets, connectWith, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
