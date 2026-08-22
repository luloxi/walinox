"use client";

import {
  createContext,
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

type WalletState = {
  wallet: LocalWallet | null;
  error: string | null;
  connected: boolean;
};

const WalletContext = createContext<WalletState>({
  wallet: null,
  error: null,
  connected: false,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [local, setLocal] = useState<LocalWallet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReceiptStore(localStorageStore());
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
  }, []);

  const wallet = useMemo(() => {
    if (isConnected && address && walletClient) {
      return fromConnected(address, walletClient);
    }
    return local;
  }, [isConnected, address, walletClient, local]);

  return (
    <WalletContext.Provider value={{ wallet, error, connected: isConnected }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  return useContext(WalletContext);
}
