"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useWalletClient } from "wagmi";
import { fromConnected } from "@/lib/connected-wallet";
import { localStorageStore, setReceiptStore } from "@/lib/receipts";
import { openWallet, randomSeedPhrase, type LocalWallet } from "@/lib/wallet";
import {
  TERMS_VERSION,
  hasSignedTos,
  saveTos,
  setLocalUnlocked,
  termsTypedData,
} from "@/lib/session";
import { isLocalHost } from "@/lib/dev";
import { seedLivedIn } from "@/lib/seed";
import { unlockOrCreateSeed } from "@/lib/seed-crypto";

const SESSION_SEED_KEY = "walinox.session.seed";
const IDLE_MS = 5 * 60 * 1000;

function readSessionSeed(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const seed = sessionStorage.getItem(SESSION_SEED_KEY);
    return seed && seed.trim() ? seed.trim() : null;
  } catch {
    return null;
  }
}

function writeSessionSeed(seed: string | null): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (seed) sessionStorage.setItem(SESSION_SEED_KEY, seed);
    else sessionStorage.removeItem(SESSION_SEED_KEY);
  } catch {
    /* quota / private mode */
  }
}

type WalletState = {
  wallet: LocalWallet | null;
  error: string | null;
  connected: boolean;
  ready: boolean;
  hydrating: boolean;
  needsTos: boolean;
  source: "injected" | "local" | null;
  unlockLocal: (pin: string) => Promise<{ created: boolean; seed: string }>;
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
  unlockLocal: async () => ({ created: false, seed: "" }),
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
  const lastActive = useRef(Date.now());
  const lockRef = useRef<() => void>(() => {});

  useEffect(() => {
    setReceiptStore(localStorageStore());
    let cancelled = false;
    void (async () => {
      const seed = readSessionSeed();
      if (seed) {
        try {
          const next = await openWallet(seed);
          if (cancelled) {
            next.dispose();
            return;
          }
          setLocal(next);
          setWantLocal(true);
          setLocalUnlocked(true);
          lastActive.current = Date.now();
        } catch {
          writeSessionSeed(null);
          setLocalUnlocked(false);
        }
      }
      if (!cancelled) setLocalChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const injected = Boolean(isConnected && address && walletClient);

  const wallet = useMemo(() => {
    if (wantLocal && local) return local;
    if (injected && address && walletClient) {
      return fromConnected(address, walletClient);
    }
    return null;
  }, [injected, address, walletClient, wantLocal, local]);

  useEffect(() => {
    if (!wallet?.address || !isLocalHost()) return;
    const timer = window.setTimeout(() => seedLivedIn(wallet.address), 0);
    return () => window.clearTimeout(timer);
  }, [wallet?.address]);

  const source: "injected" | "local" | null =
    wantLocal && local ? "local" : injected ? "injected" : wallet ? "local" : null;
  const tosOk = Boolean(wallet && hasSignedTos(wallet.address));
  const hasLocalSession = Boolean(wantLocal && local);
  const hydrating =
    !localChecked ||
    (!hasLocalSession && (status === "connecting" || status === "reconnecting"));
  const ready = Boolean(wallet && tosOk);

  const unlockLocal = useCallback(async (pin: string) => {
    setError(null);
    const { seed, created } = await unlockOrCreateSeed(pin, randomSeedPhrase);
    const next = await openWallet(seed);
    writeSessionSeed(seed);
    setLocal((current) => {
      current?.dispose();
      return next;
    });
    setLocalUnlocked(true);
    setWantLocal(true);
    lastActive.current = Date.now();
    return { created, seed };
  }, []);

  const lockLocal = useCallback(() => {
    writeSessionSeed(null);
    setLocalUnlocked(false);
    setWantLocal(false);
    setLocal((current) => {
      current?.dispose();
      return null;
    });
  }, []);

  lockRef.current = lockLocal;

  useEffect(() => {
    if (!hasLocalSession) return;

    const bump = () => {
      lastActive.current = Date.now();
    };

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "mousemove",
      "scroll",
      "focus",
    ];
    for (const name of events) window.addEventListener(name, bump, { passive: true });

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (Date.now() - lastActive.current >= IDLE_MS) lockRef.current();
        else bump();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const tick = window.setInterval(() => {
      if (Date.now() - lastActive.current >= IDLE_MS) lockRef.current();
    }, 15_000);

    return () => {
      for (const name of events) window.removeEventListener(name, bump);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(tick);
    };
  }, [hasLocalSession]);

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
