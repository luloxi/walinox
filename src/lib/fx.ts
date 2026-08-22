/** Dólar blue venta (ARS por 1 USD ≈ 1 USDT). Fallback if the API is down. */
export const FALLBACK_ARS_PER_USDT = 1550;

export type FxQuote = {
  arsPerUsdt: number;
  source: "blue" | "fallback";
  at: string;
};

export function usdtToArs(usdt: string | number, arsPerUsdt = FALLBACK_ARS_PER_USDT): number {
  const n = typeof usdt === "number" ? usdt : Number(usdt);
  if (!Number.isFinite(n)) return 0;
  return n * arsPerUsdt;
}

export function arsToUsdt(ars: string | number, arsPerUsdt = FALLBACK_ARS_PER_USDT): string {
  const n = typeof ars === "number" ? ars : Number(String(ars).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || arsPerUsdt <= 0) return "0";
  const usdt = n / arsPerUsdt;
  return usdt.toFixed(6).replace(/\.?0+$/, "") || "0";
}

/** If the seller types a small number it is USDT; a typical peso price is converted. */
export function parsePriceField(raw: string, arsPerUsdt = FALLBACK_ARS_PER_USDT): string {
  const n = Number(String(raw).replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 100) return arsToUsdt(n, arsPerUsdt);
  return String(n);
}

export function formatArs(value: number): string {
  const rounded = Math.round(value);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(rounded);
}

export function formatUsdt(value: string | number, fractionDigits = 2): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-AR", { maximumFractionDigits: fractionDigits });
}
