"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  loadOrCreateWallet,
  type LocalWallet,
} from "@/lib/wallet";
import { localStorageStore, setReceiptStore } from "@/lib/receipts";

type WalletState = {
  wallet: LocalWallet | null;
  error: string | null;
};

const WalletContext = createContext<WalletState>({ wallet: null, error: null });

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({ wallet: null, error: null });

  useEffect(() => {
    setReceiptStore(localStorageStore());
    let active = true;
    loadOrCreateWallet()
      .then((wallet) => {
        if (active) setState({ wallet, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            wallet: null,
            error: error instanceof Error ? error.message : "Wallet failed to open",
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return <WalletContext.Provider value={state}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  return useContext(WalletContext);
}
