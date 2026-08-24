import { Wallet } from "ethers";
import { describe, expect, it } from "vitest";
import { encodeEnvelopeQr, tryDecodeCompactQr } from "@/lib/envelope-pack";
import { decodeEnvelope, encodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import { buildPermit2, validatePermit2Signature } from "@/lib/permit2";

async function signedEnvelope(amount: string): Promise<SignedEnvelope> {
  const wallet = Wallet.createRandom();
  const typed = buildPermit2({
    spender: "0x3333333333333333333333333333333333333333",
    amount,
    nonce: "7",
    deadline: "2000000000",
  });
  const signature = await wallet.signTypedData(typed.domain, typed.types, typed.message);
  return {
    v: 1,
    kind: "permit2",
    owner: wallet.address,
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
  };
}

function asPermit2(scanned: SignedEnvelope) {
  return {
    domain: scanned.typedData.domain,
    types: scanned.typedData.types as ReturnType<typeof buildPermit2>["types"],
    primaryType: "PermitTransferFrom" as const,
    message: scanned.typedData.message as ReturnType<typeof buildPermit2>["message"],
  };
}

describe("envelope verify / pay scan", () => {
  it("round-trips compact QR and verifies the Permit2 signature", async () => {
    const envelope = await signedEnvelope("2000000");
    const compact = encodeEnvelopeQr(envelope);
    expect(compact.startsWith("W1:")).toBe(true);
    const scanned = decodeEnvelope(compact);
    expect(scanned.kind).toBe("permit2");
    expect(scanned.value).toBe("2000000");
    expect(validatePermit2Signature(asPermit2(scanned), scanned.signature, scanned.owner).ok).toBe(
      true,
    );
  });

  it("reads a compact payload after SMS mangles whitespace", async () => {
    const envelope = await signedEnvelope("9");
    const compact = encodeEnvelopeQr(envelope);
    const mangled = `mira esto\n${compact.replace(/\+/g, " ").replace(/(.{40})/g, "$1\n")}`;
    expect(tryDecodeCompactQr(mangled)?.value).toBe("9");
  });

  it("rejects JSON envelopes without a signature", () => {
    expect(() =>
      decodeEnvelope(JSON.stringify({ v: 1, kind: "permit2", signature: "nope" })),
    ).toThrow(/signature/i);
  });

  it("JSON encode/decode preserves Permit2 fields for online settle", async () => {
    const envelope = await signedEnvelope("11");
    const back = decodeEnvelope(encodeEnvelope(envelope));
    expect(back.owner.toLowerCase()).toBe(envelope.owner.toLowerCase());
    expect(validatePermit2Signature(asPermit2(back), back.signature, back.owner).ok).toBe(true);
  });
});
