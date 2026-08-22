import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  ledgerWallet,
  metaMaskWallet,
  rabbyWallet,
  rainbowWallet,
  trustWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { RPC_URL } from "@/lib/balance";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "3fbb6bba6ad1b0da945445a531d15c6b";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Wallets",
      wallets: [
        injectedWallet,
        metaMaskWallet,
        rainbowWallet,
        rabbyWallet,
        trustWallet,
        ledgerWallet,
        walletConnectWallet,
      ],
    },
  ],
  { appName: "Walinox", projectId },
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [mainnet, base],
  transports: {
    [mainnet.id]: http(RPC_URL),
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: true,
});
