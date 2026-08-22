import { describe, expect, it } from "vitest";
import { decodeEnvelope, encodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import { roundTripQrPayload } from "@/lib/qr";
import { buildPermit } from "@/lib/permit";
import { buildPermit2 } from "@/lib/permit2";
import {
  generateMonthlySummary,
  memoryStore,
  receiptFromPermit,
  setReceiptStore,
} from "@/lib/receipts";

const typed = buildPermit({
  owner: "0x2222222222222222222222222222222222222222",
  spender: "0x3333333333333333333333333333333333333333",
  value: "100000000",
  nonce: "0",
  deadline: "2000000000",
});

const envelope: SignedEnvelope = {
  v: 1,
  kind: "erc2612",
  owner: typed.message.owner,
  spender: typed.message.spender,
  token: typed.domain.verifyingContract,
  value: typed.message.value,
  typedData: {
    domain: typed.domain,
    types: typed.types,
    primaryType: typed.primaryType,
    message: typed.message,
  },
  signature: `0x${"ab".repeat(65)}`,
  explanation: "Allow 100 USDC.",
  complianceNote: "Off-chain signature.",
};

describe("offline relay codec, QR, receipts", () => {
  it("round-trips erc2612 and permit2 payloads through the codec and QR", () => {
    const encoded = encodeEnvelope(envelope);
    expect(decodeEnvelope(encoded).spender).toBe(envelope.spender);
    expect(decodeEnvelope(roundTripQrPayload(encoded)).value).toBe("100000000");

    const p2 = buildPermit2({
      spender: envelope.spender,
      amount: "50000000",
      nonce: "7",
      deadline: "2000000000",
    });
    const permit2Envelope: SignedEnvelope = {
      v: 1,
      kind: "permit2",
      owner: envelope.owner,
      spender: p2.message.spender,
      token: p2.message.permitted.token,
      value: p2.message.permitted.amount,
      typedData: {
        domain: p2.domain,
        types: p2.types,
        primaryType: p2.primaryType,
        message: p2.message as unknown as Record<string, unknown>,
      },
      signature: envelope.signature,
    };
    const back = decodeEnvelope(encodeEnvelope(permit2Envelope));
    expect(back.kind).toBe("permit2");
    expect(back.value).toBe("50000000");
    expect(decodeEnvelope(roundTripQrPayload(encodeEnvelope(permit2Envelope))).kind).toBe(
      "permit2",
    );
  });

  it("stores a receipt with the channel and folds a monthly summary", () => {
    setReceiptStore(memoryStore());
    const receipt = receiptFromPermit(
      {
        owner: envelope.owner,
        spender: envelope.spender,
        value: envelope.value,
        token: "USDC",
      },
      {
        action: "sent",
        channel: "qr",
        signature: envelope.signature,
        valid: true,
      },
    );

    expect(receipt.channel).toBe("qr");
    expect(receipt.owner).toBe(envelope.owner);

    const summary = generateMonthlySummary([receipt], new Date(receipt.at));
    expect(summary.count).toBe(1);
    expect(summary.sent).toBe(1);
    expect(summary.channels.qr).toBe(1);
    expect(summary.prose).toMatch(/Walinox/);
    expect(summary.prose).toMatch(/qr/);
  });
});
