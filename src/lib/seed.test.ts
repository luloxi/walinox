import { describe, expect, it } from "vitest";
import { LULOX_ADDRESS } from "@/lib/contacts";
import { demoVale, myStoreProducts } from "@/lib/seed";
import { MOCK_PRODUCTS } from "@/lib/stores";

describe("lived-in seed", () => {
  it("builds demo vales for a holder", () => {
    const cafe = MOCK_PRODUCTS.find((item) => item.title.startsWith("Café de especialidad"));
    expect(cafe).toBeDefined();
    const vale = demoVale(cafe!, LULOX_ADDRESS, "seed:vale:test");
    expect(vale.holder.toLowerCase()).toBe(LULOX_ADDRESS.toLowerCase());
    expect(vale.demo).toBe(true);
    expect(vale.title).toBe(cafe!.title);
  });

  it("clones lulox products onto another wallet", () => {
    const other = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const mine = myStoreProducts(other);
    expect(mine).toHaveLength(4);
    expect(mine.every((item) => item.issuer.toLowerCase() === other)).toBe(true);
    expect(mine.some((item) => item.title === "Tostado de barrio 250g")).toBe(true);
  });
});
