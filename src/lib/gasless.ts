import { USDT } from "@/lib/tokens";
import { RPC_URL } from "@/lib/balance";

/** Tether WDK EIP-7702 SimpleAccount implementation (official module default). */
export const TETHER_7702_DELEGATION = "0xe6Cae83BdE06E4c305530e199D7217f42808555B";

/** Candide public ERC-4337 bundler+paymaster. No API key. Rate-limited. */
export const CANDIDE_PUBLIC_MAINNET = "https://api.candide.dev/public/v3/1";

export type GaslessConfig = {
  provider: string;
  bundlerUrl: string;
  paymasterUrl?: string;
  delegationAddress: string;
  paymasterToken: { address: string };
};

export function gaslessConfig(): GaslessConfig {
  const config: GaslessConfig = {
    provider: RPC_URL,
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL ?? CANDIDE_PUBLIC_MAINNET,
    delegationAddress: TETHER_7702_DELEGATION,
    paymasterToken: { address: USDT.address },
  };
  const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_URL;
  if (paymasterUrl) config.paymasterUrl = paymasterUrl;
  return config;
}
