import { describe, expect, it } from "vitest";
import { browseProducts, groupProducts, searchProducts, sortProducts } from "@/lib/categories";
import { CATALOG_PRODUCTS } from "@/lib/stores";

describe("product browse", () => {
  it("searches by title, store and category", () => {
    const cafe = searchProducts(CATALOG_PRODUCTS, "tostado");
    expect(cafe.some((item) => item.title.includes("Tostado"))).toBe(true);
    expect(searchProducts(CATALOG_PRODUCTS, "lulox").every((item) => item.issuerName.includes("lulox"))).toBe(true);
    expect(searchProducts(CATALOG_PRODUCTS, "huerta").length).toBeGreaterThan(0);
  });

  it("sorts by price and groups by category", () => {
    const cheapFirst = sortProducts(CATALOG_PRODUCTS, "precio-asc");
    expect(Number(cheapFirst[0].price)).toBeLessThanOrEqual(Number(cheapFirst[1].price));
    const groups = groupProducts(CATALOG_PRODUCTS);
    expect(groups.map((group) => group.id)).toEqual(expect.arrayContaining(["comida"]));
    expect(browseProducts(CATALOG_PRODUCTS, { category: "comida" }).items.length).toBe(CATALOG_PRODUCTS.length);
    const lulox = CATALOG_PRODUCTS.filter((item) => item.storeId === "local-lulox");
    expect(lulox).toHaveLength(4);
    const browsed = browseProducts(CATALOG_PRODUCTS, { category: "cafe", sort: "precio-desc" });
    expect(browsed.groups).toBeNull();
    expect(browsed.items.every((item) => item.category === "cafe")).toBe(true);
    const food = browseProducts(CATALOG_PRODUCTS, { category: "comida", sort: "categoria" });
    expect(food.groups?.some((group) => group.id === "cafe")).toBe(true);
    expect(browseProducts(CATALOG_PRODUCTS, { category: "ropa" }).items).toHaveLength(0);
    const local = browseProducts(CATALOG_PRODUCTS, { store: "local-lulox" });
    expect(local.items).toHaveLength(4);
    expect(local.items.every((item) => item.storeId === "local-lulox")).toBe(true);
  });
});
