import { describe, expect, it } from "vitest";
import { encodeEnvelopeQr, tryDecodeCompactQr } from "@/lib/envelope-pack";
import { decodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import { buildPermit2 } from "@/lib/permit2";

const p2 = buildPermit2({
  spender: "0x3333333333333333333333333333333333333333",
  amount: "2000000",
  nonce: "7",
  deadline: "2000000000",
});

const envelope: SignedEnvelope = {
  v: 1,
  kind: "permit2",
  owner: "0x2222222222222222222222222222222222222222",
  spender: p2.message.spender,
  token: p2.message.permitted.token,
  value: p2.message.permitted.amount,
  typedData: {
    domain: p2.domain,
    types: p2.types,
    primaryType: p2.primaryType,
    message: p2.message as unknown as Record<string, unknown>,
  },
  signature: `0x${"ab".repeat(65)}`,
};

describe("compact envelope QR / SMS", () => {
  it("round-trips and stays small enough for SMS", () => {
    const compact = encodeEnvelopeQr(envelope);
    expect(compact.startsWith("W1:")).toBe(true);
    expect(compact.length).toBeLessThan(400);
    const back = decodeEnvelope(compact);
    expect(back.kind).toBe("permit2");
    expect(back.value).toBe("2000000");
    expect(back.spender).toBe(envelope.spender);
  });

  it("reads a compact payload after SMS mangles whitespace and plus signs", () => {
    const compact = encodeEnvelopeQr(envelope);
    const mangled = `mirá esto\n${compact.replace(/\+/g, " ").replace(/(.{40})/g, "$1\n")}`;
    const back = tryDecodeCompactQr(mangled);
    expect(back?.value).toBe("2000000");
    expect(decodeEnvelope(mangled).spender).toBe(envelope.spender);
  });
});
