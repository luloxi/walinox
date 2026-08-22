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

/** RainbowKit sample id — Reown Cloud rejects localhost (403). Only use a real project id. */
const SAMPLE_WC_ID = "3fbb6bba6ad1b0da945445a531d15c6b";
const configuredId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
export const walletConnectEnabled = Boolean(configuredId && configuredId !== SAMPLE_WC_ID);
const projectId = walletConnectEnabled ? configuredId : SAMPLE_WC_ID;

const wallets = [
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  rabbyWallet,
  trustWallet,
  ledgerWallet,
  ...(walletConnectEnabled ? [walletConnectWallet] : []),
];

const connectors = connectorsForWallets([{ groupName: "Wallets", wallets }], {
  appName: "Walinox",
  projectId,
});

export const wagmiConfig = createConfig({
  connectors,
  chains: [mainnet, base],
  transports: {
    [mainnet.id]: http(RPC_URL),
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: true,
});
