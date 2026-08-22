import { Interface, TypedDataEncoder, getAddress, verifyTypedData } from "ethers";
import { assertAddress, assertUintString, type Eip712Domain } from "@/lib/permit";
import { USDT } from "@/lib/tokens";

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
      nonce: assertUintString(input.nonce ?? String(Date.now()), "nonce"),
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
): { ok: true; recovered: string; digest: string } | { ok: false; reason: string; recovered?: string; digest?: string } {
  try {
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
