import { Contract, JsonRpcProvider, formatUnits } from "ethers";
import { USDT } from "@/lib/tokens";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ??
  process.env.RPC_URL ??
  "https://ethereum-rpc.publicnode.com";

const ABI = ["function balanceOf(address) view returns (uint256)"];

export type TokenBalances = {
  usdt: string;
};

export async function readBalances(owner: string): Promise<TokenBalances> {
  const provider = new JsonRpcProvider(RPC_URL, 1, { staticNetwork: true });
  const usdt = await new Contract(USDT.address, ABI, provider).balanceOf(owner);
  return { usdt: formatUnits(usdt, USDT.decimals) };
}
