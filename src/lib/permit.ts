import {
  Interface,
  Signature,
  TypedDataEncoder,
  getAddress,
  isAddress,
  verifyTypedData,
} from "ethers";

export const PERMIT_PRIMARY_TYPE = "Permit" as const;

export const PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export type PermitField = (typeof PERMIT_TYPES.Permit)[number];

export type Eip712Domain = {
  name: string;
  version?: string;
  chainId: number;
  verifyingContract: string;
};

export type PermitMessage = {
  owner: string;
  spender: string;
  value: string;
  nonce: string;
  deadline: string;
};

export type PermitTypedData = {
  domain: Eip712Domain;
  types: {
    Permit: { name: string; type: string }[];
  };
  primaryType: typeof PERMIT_PRIMARY_TYPE;
  message: PermitMessage;
};

export const PERMIT_IFACE = new Interface([
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
]);

export const DEFAULT_DOMAIN: Eip712Domain = {
  name: "USD Coin",
  version: "2",
  chainId: 1,
  verifyingContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

export function assertAddress(value: string, label: string): string {
  if (!isAddress(value)) {
    throw new Error(`Invalid ${label} address`);
  }
  return getAddress(value);
}

export function assertUintString(value: string, label: string): string {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Invalid ${label}: expected a non-negative integer string`);
  }
  return trimmed;
}

export function buildPermit(input: {
  domain?: Partial<Eip712Domain>;
  owner: string;
  spender: string;
  value: string;
  nonce?: string;
  deadline?: string;
}): PermitTypedData {
  const domain: Eip712Domain = {
    name: input.domain?.name ?? DEFAULT_DOMAIN.name,
    version: input.domain?.version ?? DEFAULT_DOMAIN.version,
    chainId: input.domain?.chainId ?? DEFAULT_DOMAIN.chainId,
    verifyingContract: assertAddress(
      input.domain?.verifyingContract ?? DEFAULT_DOMAIN.verifyingContract,
      "verifyingContract",
    ),
  };
  if (!domain.version) delete domain.version;

  const deadline =
    input.deadline ??
    String(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);

  return {
    domain,
    types: {
      Permit: PERMIT_TYPES.Permit.map((field) => ({ ...field })),
    },
    primaryType: PERMIT_PRIMARY_TYPE,
    message: {
      owner: assertAddress(input.owner, "owner"),
      spender: assertAddress(input.spender, "spender"),
      value: assertUintString(input.value, "value"),
      nonce: assertUintString(input.nonce ?? "0", "nonce"),
      deadline: assertUintString(deadline, "deadline"),
    },
  };
}

export function hashPermit(typed: PermitTypedData): string {
  return TypedDataEncoder.hash(
    typed.domain,
    typed.types,
    typed.message,
  );
}

export function recoverPermitSigner(
  typed: PermitTypedData,
  signature: string,
): string {
  return getAddress(
    verifyTypedData(typed.domain, typed.types, typed.message, signature),
  );
}

export type PermitValidation =
  | { ok: true; recovered: string; digest: string }
  | { ok: false; reason: string; recovered?: string; digest?: string };

export function validatePermitSignature(
  typed: PermitTypedData,
  signature: string,
): PermitValidation {
  let digest: string;
  try {
    digest = hashPermit(typed);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Invalid typed data" };
  }

  let recovered: string;
  try {
    recovered = recoverPermitSigner(typed, signature);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Invalid signature",
      digest,
    };
  }

  try {
    const owner = getAddress(typed.message.owner);
    if (recovered !== owner) {
      return {
        ok: false,
        reason: `Recovered signer ${recovered} does not match owner ${owner}`,
        recovered,
        digest,
      };
    }
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Invalid owner",
      recovered,
      digest,
    };
  }

  return { ok: true, recovered, digest };
}

export function splitPermitSignature(signature: string): {
  v: number;
  r: string;
  s: string;
} {
  const sig = Signature.from(signature);
  return { v: sig.v, r: sig.r, s: sig.s };
}

export function encodePermitCall(
  typed: PermitTypedData,
  signature: string,
): { to: string; data: string } {
  const { v, r, s } = splitPermitSignature(signature);
  const { owner, spender, value, deadline } = typed.message;
  return {
    to: getAddress(typed.domain.verifyingContract),
    data: PERMIT_IFACE.encodeFunctionData("permit", [
      owner,
      spender,
      value,
      deadline,
      v,
      r,
      s,
    ]),
  };
}

export async function broadcastPermit(
  typed: PermitTypedData,
  signature: string,
): Promise<string> {
  const { sendCall } = await import("@/lib/chain");
  const { to, data } = encodePermitCall(typed, signature);
  return sendCall(to, data);
}
