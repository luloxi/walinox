"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useWalletClient } from "wagmi";
import { fromConnected } from "@/lib/connected-wallet";
import { localStorageStore, setReceiptStore } from "@/lib/receipts";
import { loadOrCreateWallet, type LocalWallet } from "@/lib/wallet";
import {
  TERMS_VERSION,
  hasSignedTos,
  saveTos,
  setLocalUnlocked,
  termsTypedData,
} from "@/lib/session";
import { isLocalHost } from "@/lib/dev";
import { seedLivedIn } from "@/lib/seed";

type WalletState = {
  wallet: LocalWallet | null;
  error: string | null;
  connected: boolean;
  ready: boolean;
  hydrating: boolean;
  needsTos: boolean;
  source: "injected" | "local" | null;
  unlockLocal: (pin: string) => Promise<void>;
  lockLocal: () => void;
  signTos: () => Promise<void>;
};

const WalletContext = createContext<WalletState>({
  wallet: null,
  error: null,
  connected: false,
  ready: false,
  hydrating: true,
  needsTos: false,
  source: null,
  unlockLocal: async () => {},
  lockLocal: () => {},
  signTos: async () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, status, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [local, setLocal] = useState<LocalWallet | null>(null);
  const [wantLocal, setWantLocal] = useState(false);
  const [localChecked, setLocalChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setTosTick] = useState(0);

  useEffect(() => {
    setReceiptStore(localStorageStore());
    const timer = window.setTimeout(() => setLocalChecked(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const injected = Boolean(isConnected && address && walletClient);

  const wallet = useMemo(() => {
    if (injected && address && walletClient) {
      return fromConnected(address, walletClient);
    }
    if (wantLocal) return local;
    return null;
  }, [injected, address, walletClient, wantLocal, local]);

  useEffect(() => {
    if (!wallet?.address || !isLocalHost()) return;
    const timer = window.setTimeout(() => seedLivedIn(wallet.address), 0);
    return () => window.clearTimeout(timer);
  }, [wallet?.address]);

  const source: "injected" | "local" | null = injected ? "injected" : wallet ? "local" : null;
  const tosOk = Boolean(wallet && hasSignedTos(wallet.address));
  const hydrating =
    !localChecked || status === "connecting" || status === "reconnecting";
  const ready = Boolean(wallet && tosOk);

  const unlockLocal = useCallback(async (pin: string) => {
    setError(null);
    const next = await loadOrCreateWallet(pin);
    setLocal((current) => {
      current?.dispose();
      return next;
    });
    setLocalUnlocked(true);
    setWantLocal(true);
  }, []);

  const lockLocal = useCallback(() => {
    setLocalUnlocked(false);
    setWantLocal(false);
    setLocal((current) => {
      current?.dispose();
      return null;
    });
  }, []);

  const signTos = useCallback(async () => {
    if (!wallet) throw new Error("Conectá una wallet");
    const at = new Date().toISOString();
    const typed = termsTypedData(wallet.address, chainId ?? 1, at);
    const signature = await wallet.signTypedData(typed);
    saveTos({
      address: wallet.address,
      version: TERMS_VERSION,
      signature,
      at,
    });
    setTosTick((value) => value + 1);
  }, [wallet, chainId]);

  const value = useMemo<WalletState>(
    () => ({
      wallet,
      error,
      connected: isConnected,
      ready,
      hydrating,
      needsTos: Boolean(wallet && !tosOk),
      source,
      unlockLocal,
      lockLocal,
      signTos,
    }),
    [wallet, error, isConnected, ready, hydrating, tosOk, source, unlockLocal, lockLocal, signTos],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  return useContext(WalletContext);
}
