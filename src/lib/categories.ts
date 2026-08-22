import type { Product } from "@/lib/vale";

export const PRODUCT_CATEGORIES = ["cafe", "panaderia", "almacen", "huerta"] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  cafe: "Café",
  panaderia: "Panadería",
  almacen: "Almacén",
  huerta: "Huerta",
};

export type ProductSort = "categoria" | "precio-asc" | "precio-desc" | "recientes";

export const PRODUCT_SORTS: { id: ProductSort; label: string }[] = [
  { id: "categoria", label: "Categoría" },
  { id: "precio-asc", label: "Precio: menor" },
  { id: "precio-desc", label: "Precio: mayor" },
  { id: "recientes", label: "Recientes" },
];

export function isProductCategory(value: string | undefined): value is ProductCategory {
  return Boolean(value && (PRODUCT_CATEGORIES as readonly string[]).includes(value));
}

export function categoryLabel(id?: string): string {
  if (isProductCategory(id)) return CATEGORY_LABEL[id];
  return "Otros";
}

export function searchProducts(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter((product) => {
    const haystack = [
      product.title,
      product.issuerName,
      product.redemptionPlace,
      product.description,
      product.category,
      categoryLabel(product.category),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterByCategory(products: Product[], category: string): Product[] {
  if (!category || category === "all") return products;
  return products.filter((product) => product.category === category);
}

export function productStoreKey(product: Product): string {
  return (product.storeId ?? product.issuer).toLowerCase();
}

export function filterByStore(products: Product[], storeId: string): Product[] {
  if (!storeId || storeId === "all") return products;
  const key = storeId.toLowerCase();
  return products.filter((product) => productStoreKey(product) === key);
}

export function sortProducts(products: Product[], sort: ProductSort): Product[] {
  const copy = products.slice();
  if (sort === "precio-asc") {
    return copy.sort((a, b) => Number(a.price) - Number(b.price) || a.title.localeCompare(b.title, "es"));
  }
  if (sort === "precio-desc") {
    return copy.sort((a, b) => Number(b.price) - Number(a.price) || a.title.localeCompare(b.title, "es"));
  }
  if (sort === "categoria") {
    return copy.sort(
      (a, b) =>
        categoryLabel(a.category).localeCompare(categoryLabel(b.category), "es") ||
        Number(a.price) - Number(b.price) ||
        a.title.localeCompare(b.title, "es"),
    );
  }
  return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.title.localeCompare(b.title, "es"));
}

export type ProductGroup = { id: string; label: string; products: Product[] };

export function groupProducts(products: Product[]): ProductGroup[] {
  const map = new Map<string, Product[]>();
  for (const product of products) {
    const id = isProductCategory(product.category) ? product.category : "otros";
    const list = map.get(id) ?? [];
    list.push(product);
    map.set(id, list);
  }
  const order = [...PRODUCT_CATEGORIES, "otros"];
  return order
    .filter((id) => map.has(id))
    .map((id) => ({
      id,
      label: isProductCategory(id) ? CATEGORY_LABEL[id] : "Otros",
      products: map.get(id) ?? [],
    }));
}

export function browseProducts(
  products: Product[],
  opts: { query?: string; category?: string; store?: string; sort?: ProductSort } = {},
): { items: Product[]; groups: ProductGroup[] | null } {
  const sort = opts.sort ?? "categoria";
  const items = sortProducts(
    filterByStore(
      filterByCategory(searchProducts(products, opts.query ?? ""), opts.category ?? "all"),
      opts.store ?? "all",
    ),
    sort,
  );
  const groups = sort === "categoria" && (!opts.category || opts.category === "all") ? groupProducts(items) : null;
  return { items, groups };
}