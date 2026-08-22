import { getAddress, isAddress } from "ethers";
import type { Product } from "@/lib/vale";

export function storeSlug(issuerOrId: string): string {
  const raw = issuerOrId.trim();
  if (isAddress(raw)) return raw.toLowerCase();
  return raw;
}

export function storePath(issuerOrId: string): string {
  return `/tienda/${encodeURIComponent(storeSlug(issuerOrId))}`;
}

export function storeUrl(issuerOrId: string, origin?: string): string {
  const path = storePath(issuerOrId);
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return base ? `${base.replace(/\/$/, "")}${path}` : path;
}

export function matchesStore(product: Product, id: string): boolean {
  const key = decodeURIComponent(id).trim().toLowerCase();
  if (!key) return false;
  const storeId = (product.storeId ?? product.issuer).toLowerCase();
  return storeId === key || product.issuer.toLowerCase() === key;
}

export function checksumIssuer(id: string): string | null {
  try {
    return isAddress(id) ? getAddress(id) : null;
  } catch {
    return null;
  }
}

/** Storefront and product pages a guest can open without a wallet. */
export function isPublicStorePath(pathname: string): boolean {
  if (pathname.startsWith("/products/")) return true;
  return pathname.startsWith("/tienda/") && pathname !== "/tienda";
}
