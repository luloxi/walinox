import { describe, expect, it } from "vitest";
import { CATALOG_PRODUCTS } from "@/lib/stores";
import { LULOX_ADDRESS } from "@/lib/contacts";
import { isPublicStorePath, matchesStore, storePath, storeSlug, storeUrl } from "@/lib/store-link";

describe("store link", () => {
  it("builds a shareable path from an address", () => {
    const addr = LULOX_ADDRESS;
    expect(storeSlug(addr)).toBe(addr.toLowerCase());
    expect(storePath(addr)).toBe(`/tienda/${addr.toLowerCase()}`);
    expect(storeUrl(addr, "https://walinox-nu.vercel.app")).toBe(
      `https://walinox-nu.vercel.app/tienda/${addr.toLowerCase()}`,
    );
  });

  it("matches products by store slug or issuer", () => {
    const tostado = CATALOG_PRODUCTS.find((item) => item.title.includes("Tostado"));
    expect(tostado).toBeDefined();
    expect(matchesStore(tostado!, "local-lulox")).toBe(true);
    expect(matchesStore(tostado!, tostado!.issuer)).toBe(true);
    expect(matchesStore(tostado!, "otra-tienda")).toBe(false);
  });

  it("treats a storefront and a product as public", () => {
    expect(isPublicStorePath("/tienda")).toBe(false);
    expect(isPublicStorePath("/tienda/local-lulox")).toBe(true);
    expect(isPublicStorePath(`/tienda/${LULOX_ADDRESS.toLowerCase()}`)).toBe(true);
    expect(isPublicStorePath("/products/lulox:cafe")).toBe(true);
    expect(isPublicStorePath("/")).toBe(false);
  });
});
