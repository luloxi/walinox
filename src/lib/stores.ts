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
];

const TERMS =
  "Vale de un bien físico. Se canjea en el local del emisor. No es un instrumento financiero.";

function mockProduct(
  store: Store,
  title: string,
  price: string,
  supply: number,
  place: string,
): Product {
  return {
    id: `mock:${store.id}:${title.toLowerCase().replace(/\s+/g, "-")}`,
    storeId: store.id,
    title,
    description: "",
    price,
    supply,
    sold: Math.min(2, supply - 1),
    terms: TERMS,
    issuerName: store.name,
    redemptionPlace: place,
    issuer: store.issuer,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

export const MOCK_PRODUCTS: Product[] = [
  mockProduct(MOCK_STORES[0], "Café de especialidad 250g", "12.00", 40, "Mostrador"),
  mockProduct(MOCK_STORES[0], "Blend de la casa 1kg", "38.00", 20, "Mostrador"),
  mockProduct(MOCK_STORES[1], "Facturas x docena", "8.50", 30, "Caja"),
  mockProduct(MOCK_STORES[1], "Pan de masa madre", "4.00", 50, "Caja"),
  mockProduct(MOCK_STORES[2], "Kit de huerta", "22.00", 15, "Puesto 12"),
  mockProduct(MOCK_STORES[2], "Miel 500g", "9.00", 25, "Puesto 12"),
];

export function storeById(id: string): Store | undefined {
  return MOCK_STORES.find((store) => store.id === id);
}
