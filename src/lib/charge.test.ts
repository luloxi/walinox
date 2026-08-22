import { describe, expect, it } from "vitest";
import { buildCharge, decodeCharge, encodeCharge, totalUsdt } from "@/lib/charge";

const TO = "0x1111111111111111111111111111111111111111";

describe("charge", () => {
  it("sums the basket and round-trips the QR payload", () => {
    const charge = buildCharge({
      to: TO,
      store: "Panadería Luna",
      items: [
        { productId: "a", title: "Pan", price: "5", qty: 2 },
        { productId: "b", title: "Facturas", price: "8", qty: 1 },
      ],
    });
    expect(charge.amount).toBe("18");
    expect(totalUsdt(charge.items)).toBe("18");
    const again = decodeCharge(encodeCharge(charge));
    expect(again?.to).toBe(charge.to);
    expect(again?.amount).toBe("18");
    expect(again?.items).toHaveLength(2);
  });

  it("rejects an empty basket", () => {
    expect(() =>
      buildCharge({ to: TO, store: "X", items: [{ productId: "a", title: "Pan", price: "5", qty: 0 }] }),
    ).toThrow(/vacío/);
    expect(decodeCharge('{"v":1,"kind":"permit2"}')).toBeNull();
  });
});
