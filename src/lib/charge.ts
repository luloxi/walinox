import { getAddress, isAddress } from "ethers";
import type { Product } from "@/lib/vale";

export type ChargeLine = {
  productId: string;
  title: string;
  price: string;
  qty: number;
};

export type ChargeRequest = {
  v: 1;
  kind: "charge";
  to: string;
  store: string;
  items: ChargeLine[];
  amount: string;
};

export function totalUsdt(items: ChargeLine[]): string {
  const n = items.reduce((sum, item) => {
    if (item.qty <= 0) return sum;
    const price = Number(item.price);
    if (!Number.isFinite(price)) return sum;
    return sum + price * item.qty;
  }, 0);
  if (!Number.isFinite(n) || n <= 0) return "0";
  return n.toFixed(6).replace(/\.?0+$/, "") || "0";
}

export function linesFromBasket(products: Product[], qtyById: Record<string, number>): ChargeLine[] {
  const lines: ChargeLine[] = [];
  for (const product of products) {
    const qty = qtyById[product.id] ?? 0;
    if (qty <= 0) continue;
    lines.push({
      productId: product.id,
      title: product.title,
      price: product.price,
      qty,
    });
  }
  return lines;
}

export function buildCharge(input: {
  to: string;
  store: string;
  items: ChargeLine[];
}): ChargeRequest {
  if (!isAddress(input.to)) throw new Error("Address del local inválida");
  const items = input.items.filter((item) => item.qty > 0);
  if (items.length === 0) throw new Error("El pedido está vacío");
  return {
    v: 1,
    kind: "charge",
    to: getAddress(input.to),
    store: input.store.trim() || "Local",
    items,
    amount: totalUsdt(items),
  };
}

export function encodeCharge(charge: ChargeRequest): string {
  return JSON.stringify(charge);
}

export function decodeCharge(raw: string): ChargeRequest | null {
  try {
    const parsed = JSON.parse(raw.trim()) as Partial<ChargeRequest>;
    if (parsed?.kind !== "charge" || parsed.v !== 1) return null;
    if (!parsed.to || !isAddress(parsed.to)) return null;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    const items: ChargeLine[] = parsed.items.map((item) => ({
      productId: String(item.productId ?? ""),
      title: String(item.title ?? ""),
      price: String(item.price ?? "0"),
      qty: Math.max(0, Math.floor(Number(item.qty) || 0)),
    }));
    return buildCharge({
      to: parsed.to,
      store: String(parsed.store ?? ""),
      items,
    });
  } catch {
    return null;
  }
}
