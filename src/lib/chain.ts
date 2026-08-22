import { Interface, MaxUint256, getAddress } from "ethers";

type Eth = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function injected(): Eth {
  const eth = (globalThis as { ethereum?: Eth }).ethereum;
  if (!eth) throw new Error("No injected wallet to pay gas");
  return eth;
}

export async function sendCall(to: string, data: string): Promise<string> {
  const eth = injected();
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts[0]) throw new Error("No account connected");
  return (await eth.request({
    method: "eth_sendTransaction",
    params: [{ from: accounts[0], to: getAddress(to), data }],
  })) as string;
}

const ERC20 = new Interface([
  "function approve(address spender, uint256 amount)",
  "function transfer(address to, uint256 amount)",
]);

export function encodeApprove(
  token: string,
  spender: string,
  amount: string = MaxUint256.toString(),
): { to: string; data: string } {
  return {
    to: getAddress(token),
    data: ERC20.encodeFunctionData("approve", [getAddress(spender), amount]),
  };
}

export function encodeTransfer(
  token: string,
  to: string,
  amount: string,
): { to: string; data: string } {
  return {
    to: getAddress(token),
    data: ERC20.encodeFunctionData("transfer", [getAddress(to), amount]),
  };
}
