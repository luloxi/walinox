import { buildPermit, type Eip712Domain } from "@/lib/permit";
import { buildPermit2 } from "@/lib/permit2";
import type { PermitKind } from "@/lib/tokens";
import { unwrapPears } from "@/lib/pears";

export const PAYLOAD_VERSION = 1 as const;

export type SignedEnvelope = {
  v: typeof PAYLOAD_VERSION;
  kind: PermitKind;
  owner: string;
  spender: string;
  token: string;
  value: string;
  typedData: {
    domain: Eip712Domain;
    types: Record<string, { name: string; type: string }[]>;
    primaryType: string;
    message: Record<string, unknown>;
  };
  signature: string;
  explanation?: string;
  complianceNote?: string;
};

export function encodeEnvelope(envelope: SignedEnvelope): string {
  if (envelope.v !== PAYLOAD_VERSION) {
    throw new Error("Unsupported payload version");
  }
  if (!envelope.signature.startsWith("0x")) {
    throw new Error("Signature must be hex");
  }
  return JSON.stringify(envelope);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new Error("Expected object");
  }
  return value as Record<string, unknown>;
}

export function decodeEnvelope(raw: string): SignedEnvelope {
  const { body } = unwrapPears(raw);
  const parsed = asRecord(JSON.parse(body));
  if (parsed.v !== PAYLOAD_VERSION) {
    throw new Error("Unsupported payload version");
  }

  const signature = String(parsed.signature ?? "");
  if (!signature.startsWith("0x") || signature.length < 132) {
    throw new Error("Payload is missing a signature");
  }

  const typedObj = asRecord(parsed.typedData);
  const message = asRecord(typedObj.message);
  const domain = asRecord(typedObj.domain);
  const kind: PermitKind = parsed.kind === "permit2" ? "permit2" : "erc2612";

  if (kind === "permit2") {
    const permitted = asRecord(message.permitted);
    const typed = buildPermit2({
      token: String(permitted.token ?? parsed.token ?? ""),
      spender: String(message.spender ?? parsed.spender ?? ""),
      amount: String(permitted.amount ?? parsed.value ?? ""),
      nonce: String(message.nonce ?? ""),
      deadline: String(message.deadline ?? ""),
      chainId: Number(domain.chainId),
    });
    return {
      v: PAYLOAD_VERSION,
      kind,
      owner: String(parsed.owner ?? ""),
      spender: typed.message.spender,
      token: typed.message.permitted.token,
      value: typed.message.permitted.amount,
      typedData: {
        domain: typed.domain,
        types: typed.types,
        primaryType: typed.primaryType,
        message: typed.message as unknown as Record<string, unknown>,
      },
      signature,
      explanation: typeof parsed.explanation === "string" ? parsed.explanation : undefined,
      complianceNote:
        typeof parsed.complianceNote === "string" ? parsed.complianceNote : undefined,
    };
  }

  const typed = buildPermit({
    domain: {
      name: String(domain.name ?? ""),
      version: domain.version ? String(domain.version) : undefined,
      chainId: Number(domain.chainId),
      verifyingContract: String(domain.verifyingContract ?? ""),
    },
    owner: String(message.owner ?? parsed.owner ?? ""),
    spender: String(message.spender ?? parsed.spender ?? ""),
    value: String(message.value ?? parsed.value ?? ""),
    nonce: String(message.nonce ?? ""),
    deadline: String(message.deadline ?? ""),
  });

  return {
    v: PAYLOAD_VERSION,
    kind,
    owner: typed.message.owner,
    spender: typed.message.spender,
    token: typed.domain.verifyingContract,
    value: typed.message.value,
    typedData: {
      domain: typed.domain,
      types: typed.types,
      primaryType: typed.primaryType,
      message: typed.message as unknown as Record<string, unknown>,
    },
    signature,
    explanation: typeof parsed.explanation === "string" ? parsed.explanation : undefined,
    complianceNote:
      typeof parsed.complianceNote === "string" ? parsed.complianceNote : undefined,
  };
}

export function envelopeFilename(envelope: SignedEnvelope): string {
  return `walinox-${envelope.owner.slice(2, 8)}-${envelope.kind}.json`;
}
