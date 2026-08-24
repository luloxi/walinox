import { describe, expect, it } from "vitest";
import {
  bleAssemble,
  bleChunks,
  createOpticalAssembler,
  demodulateFsk,
  modulateFsk,
  opticalGrids,
  packAir,
  unpackAir,
} from "@/lib/air";
import { COMPACT_QR_PREFIX, encodeEnvelopeQr, tryDecodeCompactQr } from "@/lib/envelope-pack";
import { decodeEnvelope, encodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import { payloadToMatrix, qrRenderOptions, roundTripQrPayload } from "@/lib/qr";
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

describe("compact QR payload", () => {
  it("emits W1: base64url without padding and scans smaller than JSON", () => {
    const compact = encodeEnvelopeQr(envelope);
    expect(compact.startsWith(COMPACT_QR_PREFIX)).toBe(true);
    expect(compact).not.toMatch(/[+/=]/);
    expect(compact.length).toBeLessThan(290);
    expect(qrRenderOptions(compact).errorCorrectionLevel).toBe("L");
    const modules = payloadToMatrix(compact).length;
    expect(modules).toBeLessThanOrEqual(61);
    expect(modules).toBeLessThan(payloadToMatrix(encodeEnvelope(envelope)).length);
  });

  it("round-trips compact and leftover JSON through QR pixels", () => {
    const compact = encodeEnvelopeQr(envelope);
    expect(decodeEnvelope(roundTripQrPayload(compact)).value).toBe("2000000");
    expect(decodeEnvelope(roundTripQrPayload(encodeEnvelope(envelope))).kind).toBe("permit2");
  });

  it("still reads legacy W1: standard base64 with plus signs", () => {
    const compact = encodeEnvelopeQr(envelope);
    const b64 = compact
      .slice(COMPACT_QR_PREFIX.length)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const legacy = `${COMPACT_QR_PREFIX}${padded}`;
    expect(tryDecodeCompactQr(legacy)?.value).toBe("2000000");
  });
});

describe("offline handover codecs", () => {
  it("copy/file/nfc text is the compact payload", () => {
    const text = encodeEnvelopeQr(envelope);
    const back = decodeEnvelope(text);
    expect(back.spender).toBe(envelope.spender);
    expect(back.signature).toBe(envelope.signature);
  });

  it("sound FSK pack/unpack compact W1 as AIR_ENVELOPE", () => {
    const compact = encodeEnvelopeQr(envelope);
    const packet = packAir(compact);
    expect(packet.length).toBeLessThan(compact.length);
    const pcm = modulateFsk(packet, 48000);
    const decoded = demodulateFsk(pcm, 48000);
    expect(decoded).not.toBeNull();
    expect(decodeEnvelope(unpackAir(decoded!)).value).toBe("2000000");
  });

  it("optical grids reassemble compact envelope", () => {
    const packet = packAir(encodeEnvelopeQr(envelope));
    const grids = opticalGrids(packet);
    const asm = createOpticalAssembler();
    let got: Uint8Array | null = null;
    for (const grid of grids) {
      got = asm.pushGrid(grid);
      if (got) break;
    }
    expect(got).not.toBeNull();
    expect(decodeEnvelope(unpackAir(got!)).kind).toBe("permit2");
  });

  it("BLE chunk/join preserves compact air packet", () => {
    const packet = packAir(encodeEnvelopeQr(envelope));
    expect(Array.from(bleAssemble(bleChunks(packet)))).toEqual(Array.from(packet));
  });
});
