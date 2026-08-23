import { LULOX_ADDRESS } from "@/lib/contacts";
import type { ProductCategory } from "@/lib/categories";
import type { Product } from "@/lib/vale";

export type Store = {
  id: string;
  name: string;
  place: string;
  issuer: string;
};

export const CATALOG_STORES: Store[] = [
  {
    id: "local-lulox",
    name: "Local de lulox",
    place: "Villa Crespo",
    issuer: LULOX_ADDRESS,
  },
];

const TERMS =
  "Vale de un bien físico. Se canjea en el local del emisor. No es un instrumento financiero.";

function catalogProduct(
  store: Store,
  title: string,
  price: string,
  supply: number,
  place: string,
  image: string,
  category: ProductCategory,
  createdAt: string,
): Product {
  return {
    id: `lulox:${store.id}:${title.toLowerCase().replace(/\s+/g, "-")}`,
    storeId: store.id,
    title,
    description: "",
    image,
    price,
    supply,
    sold: 0,
    terms: TERMS,
    issuerName: store.name,
    redemptionPlace: place,
    issuer: store.issuer,
    createdAt,
    category,
  };
}

const localLulox = CATALOG_STORES[0];

export const CATALOG_PRODUCTS: Product[] = [
  catalogProduct(localLulox, "Tostado de barrio 250g", "2", 30, "Mostrador", "/products/cafe-250g.jpg", "cafe", "2026-04-04T12:00:00.000Z"),
  catalogProduct(localLulox, "Facturas del sábado", "1", 40, "Caja", "/products/facturas.jpg", "panaderia", "2026-04-11T09:00:00.000Z"),
  catalogProduct(localLulox, "Yerba mate 500g", "2", 25, "Almacén", "/products/blend-1kg.jpg", "almacen", "2026-05-02T14:00:00.000Z"),
  catalogProduct(localLulox, "Plantín de albahaca", "1", 20, "Huerta", "/products/huerta.jpg", "huerta", "2026-05-20T16:00:00.000Z"),
];

export function storeById(id: string): Store | undefined {
  return CATALOG_STORES.find((store) => store.id === id);
}
