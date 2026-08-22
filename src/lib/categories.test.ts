import { describe, expect, it } from "vitest";
import { browseProducts, groupProducts, searchProducts, sortProducts } from "@/lib/categories";
import { MOCK_PRODUCTS } from "@/lib/stores";

describe("product browse", () => {
  it("searches by title, store and category", () => {
    const cafe = searchProducts(MOCK_PRODUCTS, "café");
    expect(cafe.some((item) => item.title.includes("especialidad"))).toBe(true);
    expect(searchProducts(MOCK_PRODUCTS, "lulox").every((item) => item.issuerName.includes("lulox"))).toBe(true);
    expect(searchProducts(MOCK_PRODUCTS, "huerta").length).toBeGreaterThan(0);
  });

  it("sorts by price and groups by category", () => {
    const cheapFirst = sortProducts(MOCK_PRODUCTS, "precio-asc");
    expect(Number(cheapFirst[0].price)).toBeLessThanOrEqual(Number(cheapFirst[1].price));
    const groups = groupProducts(MOCK_PRODUCTS);
    expect(groups.map((group) => group.id)).toEqual(expect.arrayContaining(["cafe", "panaderia", "almacen", "huerta"]));
    const lulox = MOCK_PRODUCTS.filter((item) => item.storeId === "local-lulox");
    expect(lulox).toHaveLength(4);
    const browsed = browseProducts(MOCK_PRODUCTS, { category: "cafe", sort: "precio-desc" });
    expect(browsed.groups).toBeNull();
    expect(browsed.items.every((item) => item.category === "cafe")).toBe(true);
    const local = browseProducts(MOCK_PRODUCTS, { store: "local-lulox" });
    expect(local.items).toHaveLength(4);
    expect(local.items.every((item) => item.storeId === "local-lulox")).toBe(true);
  });
});
