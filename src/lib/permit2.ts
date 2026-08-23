import { Contract, Interface, JsonRpcProvider, MaxUint256, TypedDataEncoder, getAddress, verifyTypedData } from "ethers";
import { RPC_URL } from "@/lib/balance";
import { assertAddress, assertUintString, type Eip712Domain } from "@/lib/permit";
import { USDT } from "@/lib/tokens";
import type { LocalWallet } from "@/lib/wallet";

export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

export const PERMIT2_TYPES = {
  PermitTransferFrom: [
    { name: "permitted", type: "TokenPermissions" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ],
};

export type Permit2Message = {
  permitted: { token: string; amount: string };
  spender: string;
  nonce: string;
  deadline: string;
};

export type Permit2TypedData = {
  domain: Eip712Domain;
  types: typeof PERMIT2_TYPES;
  primaryType: "PermitTransferFrom";
  message: Permit2Message;
};

export function permit2Domain(chainId = 1): Eip712Domain {
  return {
    name: "Permit2",
    chainId,
    verifyingContract: PERMIT2_ADDRESS,
  };
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let hex = "0x";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return BigInt(hex).toString();
}

export function buildPermit2(input: {
  token?: string;
  spender: string;
  amount: string;
  nonce?: string;
  deadline?: string;
  chainId?: number;
}): Permit2TypedData {
  const chainId = input.chainId ?? 1;
  const deadline =
    input.deadline ?? String(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
  return {
    domain: permit2Domain(chainId),
    types: PERMIT2_TYPES,
    primaryType: "PermitTransferFrom",
    message: {
      permitted: {
        token: assertAddress(input.token ?? USDT.address, "token"),
        amount: assertUintString(input.amount, "amount"),
      },
      spender: assertAddress(input.spender, "spender"),
      nonce: assertUintString(input.nonce ?? randomNonce(), "nonce"),
      deadline: assertUintString(deadline, "deadline"),
    },
  };
}

export function hashPermit2(typed: Permit2TypedData): string {
  return TypedDataEncoder.hash(typed.domain, typed.types, typed.message);
}

export function recoverPermit2Signer(
  typed: Permit2TypedData,
  signature: string,
): string {
  return getAddress(
    verifyTypedData(typed.domain, typed.types, typed.message, signature),
  );
}

export function validatePermit2Signature(
  typed: Permit2TypedData,
  signature: string,
  owner: string,
  nowSec = Math.floor(Date.now() / 1000),
): { ok: true; recovered: string; digest: string } | { ok: false; reason: string; recovered?: string; digest?: string } {
  try {
    const deadline = Number(typed.message.deadline);
    if (!Number.isFinite(deadline) || deadline < nowSec) {
      return { ok: false, reason: "Permiso vencido" };
    }
    if (BigInt(typed.message.permitted.amount) <= BigInt(0)) {
      return { ok: false, reason: "Monto inválido" };
    }
    const digest = hashPermit2(typed);
    const recovered = recoverPermit2Signer(typed, signature);
    if (recovered !== getAddress(owner)) {
      return {
        ok: false,
        reason: `Recovered signer ${recovered} does not match owner ${getAddress(owner)}`,
        recovered,
        digest,
      };
    }
    return { ok: true, recovered, digest };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Invalid signature" };
  }
}

const PERMIT2_IFACE = new Interface([
  "function permitTransferFrom(((address token,uint256 amount) permitted,uint256 nonce,uint256 deadline) permit,(address to,uint256 requestedAmount) transferDetails,address owner,bytes signature)",
]);

export function encodePermit2TransferFrom(
  typed: Permit2TypedData,
  signature: string,
  owner: string,
): { to: string; data: string } {
  const { permitted, nonce, deadline, spender } = typed.message;
  return {
    to: PERMIT2_ADDRESS,
    data: PERMIT2_IFACE.encodeFunctionData("permitTransferFrom", [
      { permitted, nonce, deadline },
      { to: spender, requestedAmount: permitted.amount },
      getAddress(owner),
      signature,
    ]),
  };
}

const ALLOWANCE_ABI = ["function allowance(address owner, address spender) view returns (uint256)"];

export async function readPermit2Allowance(owner: string): Promise<bigint> {
  const provider = new JsonRpcProvider(RPC_URL, 1, { staticNetwork: true });
  const usdt = new Contract(USDT.address, ALLOWANCE_ABI, provider);
  return BigInt(await usdt.allowance(getAddress(owner), PERMIT2_ADDRESS));
}

/** USDT has no ERC-2612 permit(). Offline Permit2 spends need a one-time on-chain approve(Permit2). */
export async function ensurePermit2Allowance(wallet: Pick<LocalWallet, "address" | "approve">): Promise<void> {
  const current = await readPermit2Allowance(wallet.address);
  if (current > MaxUint256 / BigInt(2)) return;
  if (current > BigInt(0)) {
    await wallet.approve(USDT.address, PERMIT2_ADDRESS, "0");
  }
  await wallet.approve(USDT.address, PERMIT2_ADDRESS);
}

export function explainPermit2SettleError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/TRANSFER_FROM_FAILED/i.test(raw)) {
    return "El pagador tiene que aprobar Permit2 una vez, con internet, y tener USDT. USDT no tiene permit(): sin ese approve el cobro revierte. La misma firma sirve después del approve.";
  }
  if (/eth_estimateUserOperationGas|bundler/i.test(raw)) {
    return `El bundler gasless no pudo estimar. ${raw}`;
  }
  return raw;
}

export async function settlePermit2Envelope(
  envelope: {
    owner: string;
    spender: string;
    token: string;
    value: string;
    signature: string;
    typedData: { domain: { chainId: number }; message: Record<string, unknown> };
  },
  send: (to: string, data: string) => Promise<string>,
): Promise<string> {
  const { to, data } = encodePermit2TransferFrom(
    buildPermit2({
      token: envelope.token,
      spender: envelope.spender,
      amount: envelope.value,
      nonce: String(envelope.typedData.message.nonce ?? ""),
      deadline: String(envelope.typedData.message.deadline ?? ""),
      chainId: envelope.typedData.domain.chainId,
    }),
    envelope.signature,
    envelope.owner,
  );
  try {
    return await send(to, data);
  } catch (err) {
    throw new Error(explainPermit2SettleError(err));
  }
}
