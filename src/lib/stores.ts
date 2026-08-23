import { LULOX_ADDRESS } from "@/lib/contacts";
import type { ProductCategory } from "@/lib/categories";
import type { Product } from "@/lib/vale";

export type Store = {
  id: string;
  name: string;
  place: string;
  issuer: string;
};

export const MOCK_STORES: Store[] = [
  {
    id: "tostaduria-sur",
    name: "Tostaduría Sur",
    place: "Palermo",
    issuer: "0x1111111111111111111111111111111111111111",
  },
  {
    id: "panaderia-luna",
    name: "Panadería Luna",
    place: "San Telmo",
    issuer: "0x2222222222222222222222222222222222222222",
  },
  {
    id: "feria-oeste",
    name: "Feria Oeste",
    place: "Caballito",
    issuer: "0x3333333333333333333333333333333333333333",
  },
  {
    id: "local-lulox",
    name: "Local de lulox",
    place: "Villa Crespo",
    issuer: LULOX_ADDRESS,
  },
];

const TERMS =
  "Vale de un bien físico. Se canjea en el local del emisor. No es un instrumento financiero.";

function mockProduct(
  store: Store,
  title: string,
  price: string,
  supply: number,
  place: string,
  image: string,
  category: ProductCategory,
  sold?: number,
  createdAt = "2026-01-01T00:00:00.000Z",
): Product {
  return {
    id: `mock:${store.id}:${title.toLowerCase().replace(/\s+/g, "-")}`,
    storeId: store.id,
    title,
    description: "",
    image,
    price,
    supply,
    sold: sold ?? Math.min(2, supply - 1),
    terms: TERMS,
    issuerName: store.name,
    redemptionPlace: place,
    issuer: store.issuer,
    createdAt,
    category,
  };
}

const tostaduria = MOCK_STORES[0];
const panaderia = MOCK_STORES[1];
const feria = MOCK_STORES[2];
const localLulox = MOCK_STORES[3];

export const MOCK_PRODUCTS: Product[] = [
  mockProduct(tostaduria, "Café de especialidad 250g", "9", 40, "Mostrador", "/products/cafe-250g.jpg", "cafe", 18, "2026-02-10T11:00:00.000Z"),
  mockProduct(tostaduria, "Blend de la casa 1kg", "27", 20, "Mostrador", "/products/blend-1kg.jpg", "cafe", 6, "2026-03-02T11:00:00.000Z"),
  mockProduct(panaderia, "Facturas x docena", "8", 30, "Caja", "/products/facturas.jpg", "panaderia", 22, "2026-02-18T08:00:00.000Z"),
  mockProduct(panaderia, "Pan de masa madre", "5", 50, "Caja", "/products/pan.jpg", "panaderia", 31, "2026-01-20T08:00:00.000Z"),
  mockProduct(feria, "Kit de huerta", "18", 15, "Puesto 12", "/products/huerta.jpg", "huerta", 9, "2026-04-12T15:00:00.000Z"),
  mockProduct(feria, "Miel 500g", "7", 25, "Puesto 12", "/products/miel.jpg", "almacen", 11, "2026-03-22T15:00:00.000Z"),
  mockProduct(localLulox, "Tostado de barrio 250g", "2", 30, "Mostrador", "/products/cafe-250g.jpg", "cafe", 9, "2026-04-04T12:00:00.000Z"),
  mockProduct(localLulox, "Facturas del sábado", "1", 40, "Caja", "/products/facturas.jpg", "panaderia", 16, "2026-04-11T09:00:00.000Z"),
  mockProduct(localLulox, "Yerba mate 500g", "2", 25, "Almacén", "/products/blend-1kg.jpg", "almacen", 7, "2026-05-02T14:00:00.000Z"),
  mockProduct(localLulox, "Plantín de albahaca", "1", 20, "Huerta", "/products/huerta.jpg", "huerta", 5, "2026-05-20T16:00:00.000Z"),
];

export function storeById(id: string): Store | undefined {
  return MOCK_STORES.find((store) => store.id === id);
}
