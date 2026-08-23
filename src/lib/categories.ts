import type { Product } from "@/lib/vale";

export const PRODUCT_GROUPS = [
  {
    id: "comida",
    label: "Comida",
    items: [
      { id: "cafe", label: "Café" },
      { id: "panaderia", label: "Panadería" },
      { id: "almacen", label: "Almacén" },
      { id: "huerta", label: "Huerta" },
      { id: "kiosco", label: "Kiosco" },
      { id: "rotiseria", label: "Rotisería" },
      { id: "restaurante", label: "Restaurante" },
      { id: "bar", label: "Bar" },
      { id: "heladeria", label: "Heladería" },
      { id: "carniceria", label: "Carnicería" },
      { id: "pescaderia", label: "Pescadería" },
      { id: "verduleria", label: "Verdulería" },
      { id: "dietetica", label: "Dietética" },
      { id: "pizzas", label: "Pizzas" },
      { id: "empanadas", label: "Empanadas" },
      { id: "sandwiches", label: "Sándwiches" },
      { id: "pastas", label: "Pastas" },
      { id: "comidas-listas", label: "Comidas listas" },
      { id: "bebidas", label: "Bebidas" },
      { id: "golosinas", label: "Golosinas" },
      { id: "lacteos", label: "Lácteos" },
      { id: "fiambreria", label: "Fiambrería" },
    ],
  },
  {
    id: "ropa",
    label: "Ropa",
    items: [
      { id: "remeras", label: "Remeras" },
      { id: "camisas", label: "Camisas" },
      { id: "pantalones", label: "Pantalones" },
      { id: "shorts", label: "Shorts" },
      { id: "faldas", label: "Faldas" },
      { id: "vestidos", label: "Vestidos" },
      { id: "camperas", label: "Camperas" },
      { id: "buzos", label: "Buzos" },
      { id: "calzado", label: "Calzado" },
      { id: "medias", label: "Medias" },
      { id: "ropa-interior", label: "Ropa interior" },
      { id: "lenceria", label: "Lencería" },
      { id: "accesorios-moda", label: "Accesorios" },
      { id: "bolsos", label: "Bolsos" },
      { id: "ninos", label: "Niños" },
      { id: "bebes", label: "Bebés" },
      { id: "deportiva", label: "Deportiva" },
      { id: "trabajo", label: "Ropa de trabajo" },
    ],
  },
  {
    id: "hogar",
    label: "Hogar",
    items: [
      { id: "limpieza", label: "Limpieza" },
      { id: "bazar", label: "Bazar" },
      { id: "decoracion", label: "Decoración" },
      { id: "textiles-hogar", label: "Textiles" },
      { id: "iluminacion", label: "Iluminación" },
      { id: "jardin", label: "Jardín" },
      { id: "mascotas", label: "Mascotas" },
      { id: "ferreteria", label: "Ferretería" },
      { id: "muebles", label: "Muebles" },
      { id: "cocina-utensilios", label: "Cocina" },
    ],
  },
  {
    id: "belleza",
    label: "Belleza",
    items: [
      { id: "peluqueria", label: "Peluquería" },
      { id: "barberia", label: "Barbería" },
      { id: "cosmetica", label: "Cosmética" },
      { id: "unas", label: "Uñas" },
      { id: "perfume", label: "Perfume" },
      { id: "farmacia", label: "Farmacia" },
      { id: "cuidado-personal", label: "Cuidado personal" },
      { id: "spa", label: "Spa" },
    ],
  },
  {
    id: "oficios",
    label: "Oficios",
    items: [
      { id: "plomeria", label: "Plomería" },
      { id: "electricidad", label: "Electricidad" },
      { id: "costura", label: "Costura" },
      { id: "reparaciones", label: "Reparaciones" },
      { id: "copias", label: "Copias" },
      { id: "mensajeria", label: "Mensajería" },
      { id: "clases", label: "Clases" },
      { id: "cuidado", label: "Cuidado" },
      { id: "veterinaria", label: "Veterinaria" },
      { id: "lavadero", label: "Lavadero" },
    ],
  },
  {
    id: "feria",
    label: "Feria",
    items: [
      { id: "artesanias", label: "Artesanías" },
      { id: "ceramica", label: "Cerámica" },
      { id: "bijou", label: "Bijou" },
      { id: "cuero", label: "Cuero" },
      { id: "madera", label: "Madera" },
      { id: "tejidos", label: "Tejidos" },
      { id: "arte", label: "Arte" },
      { id: "plantas", label: "Plantas" },
    ],
  },
  {
    id: "tecnologia",
    label: "Tecnología",
    items: [
      { id: "accesorios-celu", label: "Celulares" },
      { id: "computacion", label: "Computación" },
      { id: "papeleria", label: "Papelería" },
      { id: "impresiones", label: "Impresiones" },
      { id: "audio", label: "Audio" },
    ],
  },
  {
    id: "deporte",
    label: "Deporte",
    items: [
      { id: "fitness", label: "Fitness" },
      { id: "bicicleta", label: "Bicicleta" },
      { id: "camping", label: "Camping" },
      { id: "pesca", label: "Pesca" },
      { id: "yoga", label: "Yoga" },
      { id: "pelota", label: "Pelota" },
    ],
  },
  {
    id: "infancia",
    label: "Infancia",
    items: [
      { id: "juguetes", label: "Juguetes" },
      { id: "utiles", label: "Útiles" },
      { id: "libros", label: "Libros" },
      { id: "juegos", label: "Juegos" },
      { id: "infantes", label: "Bebés y niños" },
    ],
  },
] as const;

type ProductGroupDef = (typeof PRODUCT_GROUPS)[number];

export type ProductGroupId = ProductGroupDef["id"];
export type ProductCategory = ProductGroupDef["items"][number]["id"];

export const PRODUCT_CATEGORIES: ProductCategory[] = PRODUCT_GROUPS.flatMap((group) =>
  group.items.map((item) => item.id),
);

export const CATEGORY_LABEL = Object.fromEntries(
  PRODUCT_GROUPS.flatMap((group) => group.items.map((item) => [item.id, item.label])),
) as Record<ProductCategory, string>;

export const GROUP_LABEL = Object.fromEntries(
  PRODUCT_GROUPS.map((group) => [group.id, group.label]),
) as Record<ProductGroupId, string>;

const LEAF_TO_GROUP = Object.fromEntries(
  PRODUCT_GROUPS.flatMap((group) => group.items.map((item) => [item.id, group.id])),
) as Record<ProductCategory, ProductGroupId>;

export type ProductSort = "categoria" | "precio-asc" | "precio-desc" | "recientes";

export const PRODUCT_SORTS: { id: ProductSort; label: string }[] = [
  { id: "categoria", label: "Categoría" },
  { id: "precio-asc", label: "Precio: menor" },
  { id: "precio-desc", label: "Precio: mayor" },
  { id: "recientes", label: "Recientes" },
];

export function isProductCategory(value: string | undefined): value is ProductCategory {
  return Boolean(value && value in LEAF_TO_GROUP);
}

export function isProductGroup(value: string | undefined): value is ProductGroupId {
  return Boolean(value && value in GROUP_LABEL);
}

export function groupOfCategory(id?: string): ProductGroupId | undefined {
  return isProductCategory(id) ? LEAF_TO_GROUP[id] : isProductGroup(id) ? id : undefined;
}

export function categoryLabel(id?: string): string {
  if (isProductCategory(id)) return CATEGORY_LABEL[id];
  if (isProductGroup(id)) return GROUP_LABEL[id];
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
      (() => {
        const group = groupOfCategory(product.category);
        return group ? GROUP_LABEL[group] : "";
      })(),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterByCategory(products: Product[], category: string): Product[] {
  if (!category || category === "all") return products;
  if (isProductGroup(category)) {
    return products.filter((product) => groupOfCategory(product.category) === category);
  }
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

function collectGroups(products: Product[], by: "group" | "leaf"): ProductGroup[] {
  const map = new Map<string, Product[]>();
  for (const product of products) {
    const id =
      by === "group"
        ? (groupOfCategory(product.category) ?? "otros")
        : isProductCategory(product.category)
          ? product.category
          : "otros";
    const list = map.get(id) ?? [];
    list.push(product);
    map.set(id, list);
  }
  const order =
    by === "group" ? [...PRODUCT_GROUPS.map((group) => group.id), "otros"] : [...PRODUCT_CATEGORIES, "otros"];
  return order
    .filter((id) => map.has(id))
    .map((id) => ({
      id,
      label: categoryLabel(id === "otros" ? undefined : id),
      products: map.get(id) ?? [],
    }));
}

export function groupProducts(products: Product[]): ProductGroup[] {
  return collectGroups(products, "group");
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
  const groups =
    sort !== "categoria"
      ? null
      : !opts.category || opts.category === "all"
        ? collectGroups(items, "group")
        : isProductGroup(opts.category)
          ? collectGroups(items, "leaf")
          : null;
  return { items, groups };
}