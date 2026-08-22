import { Contract, JsonRpcProvider, formatUnits } from "ethers";
import { USDC, USDT } from "@/lib/tokens";

const RPC = process.env.RPC_URL ?? "https://ethereum-rpc.publicnode.com";
const ABI = ["function balanceOf(address) view returns (uint256)"];

export type TokenBalances = {
  usdt: string;
  usdc: string;
};

export async function readBalances(owner: string): Promise<TokenBalances> {
  const provider = new JsonRpcProvider(RPC, 1, { staticNetwork: true });
  const [usdt, usdc] = await Promise.all([
    new Contract(USDT.address, ABI, provider).balanceOf(owner),
    new Contract(USDC.address, ABI, provider).balanceOf(owner),
  ]);
  return {
    usdt: formatUnits(usdt, USDT.decimals),
    usdc: formatUnits(usdc, USDC.decimals),
  };
}
