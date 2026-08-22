"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { mainnet } from "wagmi/chains";
import { useWallet } from "@/components/wallet-provider";

export const PAYMENT_CHAIN_ID = mainnet.id;

export function usePaymentChain() {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { source } = useWallet();
  const needsSwitch = source === "injected" && chainId != null && chainId !== PAYMENT_CHAIN_ID;

  async function ensure() {
    if (!needsSwitch) return;
    await switchChainAsync({ chainId: PAYMENT_CHAIN_ID });
  }

  return { chainId, needsSwitch, ensure };
}
