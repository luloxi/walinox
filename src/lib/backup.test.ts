import { describe, expect, it } from "vitest";
import { parsePayload, payloadDigest, type CloudPayload } from "@/lib/backup";
import { DEFAULT_DISPLAY } from "@/lib/display";

const ME = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PEER = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function sample(): CloudPayload {
  return {
    v: 1,
    products: [
      {
        id: "p1",
        title: "Yerba",
        description: "",
        price: "8",
        supply: 10,
        sold: 1,
        terms: "",
        issuerName: "Local",
        redemptionPlace: "",
        issuer: ME,
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ],
    contacts: [{ address: PEER, name: "Maru", note: "", createdAt: "2026-08-01T00:00:00.000Z", lastSeenAt: "2026-08-01T00:00:00.000Z" }],
    display: DEFAULT_DISPLAY,
    theme: "dark",
    receipts: [],
    inbox: [],
    catalog: { held: [], issued: [], redeemed: [] },
  };
}

describe("cloud backup payload", () => {
  it("round-trips a Spanish shop snapshot", () => {
    const payload = sample();
    expect(parsePayload(payload)?.products[0]?.title).toBe("Yerba");
    expect(payloadDigest(payload).startsWith("0x")).toBe(true);
  });

  it("drops foreign-looking junk and requires v1", () => {
    expect(parsePayload({ v: 2, products: [] })).toBeNull();
    const parsed = parsePayload({
      ...sample(),
      products: [{ id: "x", issuer: "not-an-address" }, sample().products[0]],
    });
    expect(parsed?.products).toHaveLength(1);
  });

  it("digest changes when the catalog changes", () => {
    const a = sample();
    const b = { ...a, products: [] };
    expect(payloadDigest(a)).not.toBe(payloadDigest(b));
  });
});
