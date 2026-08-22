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
import { buildCharge, encodeCharge } from "@/lib/charge";
import { decodeEnvelope, encodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import { buildPermit } from "@/lib/permit";
import { buildPermit2 } from "@/lib/permit2";

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
  explanation: "Allow 100 USDT.",
  complianceNote: "Off-chain signature.",
};

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

describe("air packet", () => {
  it("round-trips a Permit2 envelope without the verbose JSON", () => {
    const json = encodeEnvelope(permit2Envelope);
    const packet = packAir(json);
    expect(packet.length).toBeLessThan(json.length / 2);
    const back = decodeEnvelope(unpackAir(packet));
    expect(back.kind).toBe("permit2");
    expect(back.spender).toBe(permit2Envelope.spender);
    expect(back.value).toBe("50000000");
    expect(back.signature).toBe(permit2Envelope.signature);
    expect(String(back.typedData.message.nonce)).toBe("7");
  });

  it("round-trips a charge JSON as utf8", () => {
    const charge = encodeCharge(
      buildCharge({
        to: envelope.owner,
        store: "Panadería Luna",
        items: [{ productId: "a", title: "Pan", price: "5", qty: 2 }],
      }),
    );
    expect(unpackAir(packAir(charge))).toBe(charge);
  });
});

describe("FSK modem", () => {
  it("demodulates a clean Permit2 packet", () => {
    const packet = packAir(encodeEnvelope(permit2Envelope));
    const pcm = modulateFsk(packet, 48000);
    const decoded = demodulateFsk(pcm, 48000);
    expect(decoded).not.toBeNull();
    expect(unpackAir(decoded!)).toContain("permit2");
    expect(decodeEnvelope(unpackAir(decoded!)).value).toBe("50000000");
  });

  it("demodulates at 44.1 kHz", () => {
    const packet = packAir('{"hola":1}');
    const pcm = modulateFsk(packet, 44100);
    expect(unpackAir(demodulateFsk(pcm, 44100)!)).toBe('{"hola":1}');
  });
});

describe("optical frames", () => {
  it("reassembles a packet from perfect grids", () => {
    const packet = packAir(encodeEnvelope(permit2Envelope));
    const grids = opticalGrids(packet);
    const asm = createOpticalAssembler();
    let got: Uint8Array | null = null;
    for (const grid of grids) {
      got = asm.pushGrid(grid);
      if (got) break;
    }
    expect(got).not.toBeNull();
    expect(decodeEnvelope(unpackAir(got!)).value).toBe("50000000");
  });
});

describe("BLE chunks", () => {
  it("splits and joins a packet", () => {
    const packet = packAir(encodeEnvelope(permit2Envelope));
    const again = bleAssemble(bleChunks(packet));
    expect(Array.from(again)).toEqual(Array.from(packet));
  });
});
