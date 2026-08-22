import { encodeFunctionData, erc20Abi, maxUint256, type WalletClient } from "viem";
import type { LocalWallet, Signable } from "@/lib/wallet";
import { isGrantActive, type SessionGrant } from "@/lib/session";

function primaryTypeOf(types: Signable["types"]): string {
  return Object.keys(types).find((key) => key !== "EIP712Domain") ?? "Permit";
}

export function fromConnected(
  address: `0x${string}`,
  walletClient: WalletClient,
  getGrant?: () => SessionGrant | null,
): LocalWallet {
  const account = address;

  async function sendWithSession(to: `0x${string}`, data: `0x${string}`): Promise<string | null> {
    const grant = getGrant?.();
    if (!isGrantActive(grant ?? null) || !grant?.permissionsContext) return null;
    if (typeof walletClient.sendCalls !== "function") return null;
    try {
      const sent = await walletClient.sendCalls({
        account,
        chain: walletClient.chain,
        calls: [{ to, data, value: BigInt(0) }],
        capabilities: {
          permissions: { context: grant.permissionsContext },
        },
      });
      if (typeof walletClient.waitForCallsStatus === "function") {
        const status = await walletClient.waitForCallsStatus({ id: sent.id });
        const hash = status.receipts?.[0]?.transactionHash;
        if (hash) return hash;
      }
      return sent.id;
    } catch {
      return null;
    }
  }

  async function send(to: `0x${string}`, data: `0x${string}`): Promise<string> {
    const silent = await sendWithSession(to, data);
    if (silent) return silent;
    return walletClient.sendTransaction({
      account,
      chain: walletClient.chain,
      to,
      data,
      value: BigInt(0),
    });
  }

  return {
    address,
    source: "injected",
    async signTypedData(typed) {
      return walletClient.signTypedData({
        account,
        domain: {
          name: typed.domain.name,
          version: typed.domain.version,
          chainId: typed.domain.chainId,
          verifyingContract: typed.domain.verifyingContract as `0x${string}`,
        },
        types: typed.types,
        primaryType: primaryTypeOf(typed.types),
        message: typed.message,
      });
    },
    async signPermit(typed) {
      return walletClient.signTypedData({
        account,
        domain: {
          name: typed.domain.name,
          version: typed.domain.version,
          chainId: typed.domain.chainId,
          verifyingContract: typed.domain.verifyingContract as `0x${string}`,
        },
        types: typed.types,
        primaryType: "Permit",
        message: typed.message,
      });
    },
    async transfer(token, recipient, amount) {
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipient as `0x${string}`, BigInt(amount)],
      });
      return send(token as `0x${string}`, data);
    },
    async sendCalldata(to, data) {
      return send(to as `0x${string}`, data as `0x${string}`);
    },
    async approve(token, spender, amount = maxUint256.toString()) {
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [spender as `0x${string}`, BigInt(amount)],
      });
      return send(token as `0x${string}`, data);
    },
    dispose() {},
  };
}
