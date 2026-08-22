import { getAddress, isAddress } from "ethers";
import { MOCK_PRODUCTS, MOCK_STORES, type Store } from "@/lib/stores";
import { matchesStore } from "@/lib/store-link";
import type { Product, RedeemRecord, ValeEnvelope } from "@/lib/vale";

type CatalogStore = {
  products: Product[];
  held: ValeEnvelope[];
  issued: ValeEnvelope[];
  redeemed: RedeemRecord[];
};

const STORAGE_KEY = "walinox.catalog";

const EMPTY: CatalogStore = { products: [], held: [], issued: [], redeemed: [] };

const MOCK_FLAG = "walinox.mock.v2";

function load(): CatalogStore {
  if (typeof localStorage === "undefined") return { products: [], held: [], issued: [], redeemed: [] };
  const raw = localStorage.getItem(STORAGE_KEY);
  let store: CatalogStore = { products: [], held: [], issued: [], redeemed: [] };
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<CatalogStore>;
      store = {
        products: parsed.products ?? [],
        held: parsed.held ?? [],
        issued: parsed.issued ?? [],
        redeemed: parsed.redeemed ?? [],
      };
    } catch {
      store = { products: [], held: [], issued: [], redeemed: [] };
    }
  }
  let patched = false;
  const known = new Set(store.products.map((item) => item.id));
  const missing = MOCK_PRODUCTS.filter((item) => !known.has(item.id));
  if (missing.length > 0) {
    store.products = [...missing, ...store.products];
    patched = true;
  }
  if (typeof localStorage !== "undefined") localStorage.setItem(MOCK_FLAG, "1");
  for (const mock of MOCK_PRODUCTS) {
    const found = store.products.find((item) => item.id === mock.id);
    if (!found) continue;
    if (!found.image && mock.image) {
      found.image = mock.image;
      patched = true;
    }
    if (mock.price && found.price !== mock.price) {
      found.price = mock.price;
      patched = true;
    }
    if (mock.category && found.category !== mock.category) {
      found.category = mock.category;
      patched = true;
    }
  }
  if (patched) save(store);
  return store;
}

function save(next: CatalogStore): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function listProducts(): Product[] {
  return load().products.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getStore(id: string): Store | undefined {
  const key = decodeURIComponent(id).trim().toLowerCase();
  const listed = listStores().find(
    (store) => store.id.toLowerCase() === key || store.issuer.toLowerCase() === key,
  );
  if (listed) return listed;
  if (isAddress(id)) {
    return {
      id: id.toLowerCase(),
      name: "Tienda",
      place: "",
      issuer: getAddress(id),
    };
  }
  return undefined;
}

export function listStores(): Store[] {
  const products = listProducts();
  const extra: Store[] = [];
  for (const product of products) {
    const id = product.storeId ?? product.issuer.toLowerCase();
    if (MOCK_STORES.some((store) => store.id === id) || extra.some((store) => store.id === id)) {
      continue;
    }
    extra.push({
      id,
      name: product.issuerName,
      place: product.redemptionPlace,
      issuer: product.issuer,
    });
  }
  return [...MOCK_STORES, ...extra];
}

export function productsByStore(storeId: string): Product[] {
  return listProducts().filter((product) => matchesStore(product, storeId));
}

export function productsByIssuer(issuer: string): Product[] {
  const key = issuer.toLowerCase();
  return listProducts().filter((product) => product.issuer.toLowerCase() === key);
}

export function removeProduct(id: string, issuer?: string): void {
  const current = load();
  current.products = current.products.filter((item) => {
    if (item.id !== id) return true;
    if (issuer && item.issuer.toLowerCase() !== issuer.toLowerCase()) return true;
    return false;
  });
  save(current);
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

export function listHeld(holder?: string): ValeEnvelope[] {
  const all = load().held;
  if (!holder) return all;
  const key = holder.toLowerCase();
  return all.filter((item) => item.holder.toLowerCase() === key);
}

export function listIssued(issuer?: string): ValeEnvelope[] {
  const all = load().issued;
  if (!issuer) return all;
  const key = issuer.toLowerCase();
  return all.filter((item) => item.issuer.toLowerCase() === key);
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
  const exists = current.issued.some((item) => item.tokenId === envelope.tokenId);
  if (!exists) current.issued.unshift(envelope);
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
