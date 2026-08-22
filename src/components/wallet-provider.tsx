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
  clearGrant,
  hasChosenSignMode,
  hasSignedTos,
  isLocalUnlocked,
  loadGrant,
  loadSignMode,
  saveSignMode,
  saveTos,
  setLocalUnlocked,
  termsTypedData,
  type SignMode,
} from "@/lib/session";
import { requestSessionGrant } from "@/lib/session-grant";
import { isLocalHost } from "@/lib/dev";
import { seedLivedIn } from "@/lib/seed";

type WalletState = {
  wallet: LocalWallet | null;
  error: string | null;
  connected: boolean;
  ready: boolean;
  hydrating: boolean;
  needsTos: boolean;
  needsMode: boolean;
  source: "injected" | "local" | null;
  signMode: SignMode;
  grantActive: boolean;
  unlockLocal: () => Promise<void>;
  lockLocal: () => void;
  signTos: () => Promise<void>;
  chooseSignMode: (mode: SignMode) => Promise<boolean>;
};

const WalletContext = createContext<WalletState>({
  wallet: null,
  error: null,
  connected: false,
  ready: false,
  hydrating: true,
  needsTos: false,
  needsMode: false,
  source: null,
  signMode: "every",
  grantActive: false,
  unlockLocal: async () => {},
  lockLocal: () => {},
  signTos: async () => {},
  chooseSignMode: async () => false,
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
    const timer = window.setTimeout(() => {
      setWantLocal(isLocalUnlocked());
      setLocalChecked(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!wantLocal) {
      const timer = window.setTimeout(() => setLocal(null), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    loadOrCreateWallet()
      .then((wallet) => {
        if (active) setLocal(wallet);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Wallet failed to open");
        }
      });
    return () => {
      active = false;
    };
  }, [wantLocal]);

  const injected = Boolean(isConnected && address && walletClient);
  const signMode = injected && address ? loadSignMode(address) : local ? loadSignMode(local.address) : "every";
  const storedGrant =
    injected && address ? loadGrant(address) : local ? loadGrant(local.address) : null;
  const activeGrant = signMode === "session" ? storedGrant : null;
  const grantActive = Boolean(activeGrant);

  const wallet = useMemo(() => {
    if (injected && address && walletClient) {
      return fromConnected(address, walletClient, () => activeGrant);
    }
    if (wantLocal) return local;
    return null;
  }, [injected, address, walletClient, wantLocal, local, activeGrant]);

  useEffect(() => {
    if (!wallet?.address || !isLocalHost()) return;
    const timer = window.setTimeout(() => seedLivedIn(wallet.address), 0);
    return () => window.clearTimeout(timer);
  }, [wallet?.address]);

  const source: "injected" | "local" | null = injected ? "injected" : wallet ? "local" : null;
  const tosOk = Boolean(wallet && hasSignedTos(wallet.address));
  const modeChosen = Boolean(wallet && hasChosenSignMode(wallet.address));
  const hydrating =
    !localChecked || status === "connecting" || status === "reconnecting";
  const ready = Boolean(wallet && tosOk && modeChosen);

  const unlockLocal = useCallback(async () => {
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

  const chooseSignMode = useCallback(
    async (mode: SignMode) => {
      if (!wallet) return false;
      if (mode === "every") {
        saveSignMode(wallet.address, "every");
        clearGrant(wallet.address);
        setTosTick((value) => value + 1);
        return true;
      }
      if (source === "local") {
        saveSignMode(wallet.address, "session");
        setTosTick((value) => value + 1);
        return true;
      }
      if (!walletClient) {
        saveSignMode(wallet.address, "every");
        setTosTick((value) => value + 1);
        return false;
      }
      try {
        const grant = await requestSessionGrant(walletClient, wallet.address);
        setTosTick((value) => value + 1);
        return Boolean(grant);
      } catch {
        saveSignMode(wallet.address, "every");
        setTosTick((value) => value + 1);
        return false;
      }
    },
    [wallet, source, walletClient],
  );

  const value = useMemo<WalletState>(
    () => ({
      wallet,
      error,
      connected: isConnected,
      ready,
      hydrating,
      needsTos: Boolean(wallet && !tosOk),
      needsMode: Boolean(wallet && tosOk && !modeChosen),
      source,
      signMode,
      grantActive,
      unlockLocal,
      lockLocal,
      signTos,
      chooseSignMode,
    }),
    [
      wallet,
      error,
      isConnected,
      ready,
      hydrating,
      tosOk,
      modeChosen,
      source,
      signMode,
      grantActive,
      unlockLocal,
      lockLocal,
      signTos,
      chooseSignMode,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  return useContext(WalletContext);
}
