import { describe, expect, it } from "vitest";
import { MOCK_PRODUCTS } from "@/lib/stores";
import { isPublicStorePath, matchesStore, storePath, storeSlug, storeUrl } from "@/lib/store-link";

describe("store link", () => {
  it("builds a shareable path from an address", () => {
    const addr = "0x1111111111111111111111111111111111111111";
    expect(storeSlug(addr)).toBe(addr.toLowerCase());
    expect(storePath(addr)).toBe(`/tienda/${addr.toLowerCase()}`);
    expect(storeUrl(addr, "https://walinox-nu.vercel.app")).toBe(
      `https://walinox-nu.vercel.app/tienda/${addr.toLowerCase()}`,
    );
  });

  it("matches products by store slug or issuer", () => {
    const cafe = MOCK_PRODUCTS.find((item) => item.title.includes("especialidad"));
    expect(cafe).toBeDefined();
    expect(matchesStore(cafe!, "tostaduria-sur")).toBe(true);
    expect(matchesStore(cafe!, cafe!.issuer)).toBe(true);
    expect(matchesStore(cafe!, "local-lulox")).toBe(false);
  });

  it("treats a storefront and a product as public", () => {
    expect(isPublicStorePath("/tienda")).toBe(false);
    expect(isPublicStorePath("/tienda/tostaduria-sur")).toBe(true);
    expect(isPublicStorePath("/tienda/0x1111111111111111111111111111111111111111")).toBe(true);
    expect(isPublicStorePath("/products/mock:cafe")).toBe(true);
    expect(isPublicStorePath("/")).toBe(false);
  });
});
