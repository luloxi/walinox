import { getAddress, isAddress } from "ethers";
import type { Product, RedeemRecord, ValeEnvelope } from "@/lib/vale";

type CatalogStore = {
  products: Product[];
  held: ValeEnvelope[];
  issued: ValeEnvelope[];
  redeemed: RedeemRecord[];
};

const STORAGE_KEY = "walinox.catalog";

const EMPTY: CatalogStore = { products: [], held: [], issued: [], redeemed: [] };

function load(): CatalogStore {
  if (typeof localStorage === "undefined") return { ...EMPTY, products: [], held: [], issued: [], redeemed: [] };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { products: [], held: [], issued: [], redeemed: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<CatalogStore>;
    return {
      products: parsed.products ?? [],
      held: parsed.held ?? [],
      issued: parsed.issued ?? [],
      redeemed: parsed.redeemed ?? [],
    };
  } catch {
    return { products: [], held: [], issued: [], redeemed: [] };
  }
}

function save(next: CatalogStore): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function listProducts(): Product[] {
  return load().products.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getProduct(id: string): Product | undefined {
  return load().products.find((item) => item.id === id);
}

export function saveProduct(product: Product): Product {
  const current = load();
  const index = current.products.findIndex((item) => item.id === product.id);
  if (index >= 0) current.products[index] = product;
  else current.products.unshift(product);
  save(current);
  return product;
}

export function bumpSold(id: string): Product {
  const product = getProduct(id);
  if (!product) throw new Error("Producto no encontrado");
  if (product.sold >= product.supply) throw new Error("Sin stock");
  const next = { ...product, sold: product.sold + 1 };
  saveProduct(next);
  return next;
}

export function listHeld(): ValeEnvelope[] {
  return load().held;
}

export function listIssued(): ValeEnvelope[] {
  return load().issued;
}

export function listRedeemed(): RedeemRecord[] {
  return load().redeemed;
}

export function isRedeemed(tokenId: string, issuer: string): boolean {
  const key = issuer.toLowerCase();
  return load().redeemed.some(
    (item) => item.tokenId === tokenId && item.issuer.toLowerCase() === key,
  );
}

export function holdVale(envelope: ValeEnvelope): void {
  const current = load();
  const exists = current.held.some((item) => item.tokenId === envelope.tokenId);
  if (!exists) current.held.unshift(envelope);
  save(current);
}

export function issueVale(envelope: ValeEnvelope): void {
  const current = load();
  current.issued.unshift(envelope);
  save(current);
}

export function redeemVale(envelope: ValeEnvelope, note: string): RedeemRecord {
  if (!isAddress(envelope.issuer)) throw new Error("Emisor inválido");
  if (isRedeemed(envelope.tokenId, envelope.issuer)) {
    throw new Error("Este vale ya fue canjeado");
  }
  const record: RedeemRecord = {
    tokenId: envelope.tokenId,
    issuer: getAddress(envelope.issuer),
    holder: envelope.holder,
    at: new Date().toISOString(),
    note,
  };
  const current = load();
  current.redeemed.unshift(record);
  current.held = current.held.filter((item) => item.tokenId !== envelope.tokenId);
  save(current);
  return record;
}

export type ProductShare = { v: 1; kind: "product"; product: Product };

export function encodeProduct(product: Product): string {
  const share: ProductShare = { v: 1, kind: "product", product };
  return JSON.stringify(share);
}

export function decodeProduct(raw: string): Product {
  const parsed = JSON.parse(raw.trim()) as ProductShare;
  if (parsed?.kind !== "product" || parsed.v !== 1 || !parsed.product?.id) {
    throw new Error("No es un producto Walinox");
  }
  return parsed.product;
}
