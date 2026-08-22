import { fiatMeta, type FiatId } from "@/lib/display";

/** Local units per 1 USDT when the API is down. ARS is dólar blue. */
export const FALLBACK_PER_USDT: Record<FiatId, number> = {
  ARS: 1550,
  VES: 910,
  BRL: 5.14,
  CLP: 915,
  UYU: 41,
  MXN: 17,
  COP: 3050,
  BOB: 7,
  PEN: 3.33,
  USD: 1,
  EUR: 0.86,
};

export const FALLBACK_ARS_PER_USDT = FALLBACK_PER_USDT.ARS;

export type FxQuote = {
  fiat: FiatId;
  perUsdt: number;
  source: string;
  at: string;
};

export function usdtToFiat(usdt: string | number, perUsdt: number): number {
  const n = typeof usdt === "number" ? usdt : Number(usdt);
  if (!Number.isFinite(n) || !Number.isFinite(perUsdt)) return 0;
  return n * perUsdt;
}

export function fiatToUsdt(fiat: string | number, perUsdt: number): string {
  const n = typeof fiat === "number" ? fiat : Number(String(fiat).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || perUsdt <= 0) return "0";
  const usdt = n / perUsdt;
  return usdt.toFixed(6).replace(/\.?0+$/, "") || "0";
}

export const usdtToArs = (usdt: string | number, arsPerUsdt = FALLBACK_ARS_PER_USDT): number =>
  usdtToFiat(usdt, arsPerUsdt);

export const arsToUsdt = (ars: string | number, arsPerUsdt = FALLBACK_ARS_PER_USDT): string =>
  fiatToUsdt(ars, arsPerUsdt);

/** ARS: a small number is USDT. Other fiats are always local currency. */
export function parsePriceField(
  raw: string,
  perUsdt = FALLBACK_ARS_PER_USDT,
  fiat: FiatId = "ARS",
): string {
  const n = Number(String(raw).replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return "";
  if (fiat === "ARS" && n < 100) return String(n);
  return fiatToUsdt(n, perUsdt);
}

export function formatFiat(value: number, fiat: FiatId = "ARS"): string {
  const meta = fiatMeta(fiat);
  const amount = meta.decimals === 0 ? Math.round(value) : value;
  if (fiat === "VES") {
    return `Bs ${amount.toLocaleString("es-VE", { maximumFractionDigits: 0 })}`;
  }
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: fiat,
      maximumFractionDigits: meta.decimals,
      minimumFractionDigits: fiat === "USD" || fiat === "EUR" ? 2 : 0,
    }).format(amount);
  } catch {
    return `${fiat} ${amount.toLocaleString(meta.locale, { maximumFractionDigits: meta.decimals })}`;
  }
}

export function formatArs(value: number): string {
  return formatFiat(value, "ARS");
}

export function formatUsdt(value: string | number, fractionDigits = 2): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-AR", { maximumFractionDigits: fractionDigits });
}

const FX_CACHE_KEY = "walinox.fx";

/** Blue venta by month when a receipt has no stamped rate. */
const BLUE_MONTH: Record<string, number> = {
  "2026-01": 1470,
  "2026-02": 1475,
  "2026-03": 1485,
  "2026-04": 1495,
  "2026-05": 1510,
  "2026-06": 1525,
  "2026-07": 1540,
  "2026-08": 1550,
};

export function cacheFxQuote(quote: FxQuote): void {
  if (typeof localStorage === "undefined") return;
  if (!Number.isFinite(quote.perUsdt) || quote.perUsdt <= 0) return;
  localStorage.setItem(FX_CACHE_KEY, JSON.stringify(quote));
}

export function cachedPerUsdt(fiat: FiatId = "ARS"): number {
  if (typeof localStorage === "undefined") return FALLBACK_PER_USDT[fiat];
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return FALLBACK_PER_USDT[fiat];
    const parsed = JSON.parse(raw) as Partial<FxQuote> & { arsPerUsdt?: number };
    if (parsed.fiat && parsed.fiat !== fiat) return FALLBACK_PER_USDT[fiat];
    const value = parsed.perUsdt ?? parsed.arsPerUsdt;
    if (Number.isFinite(value) && (value as number) > 0) return value as number;
  } catch {
    /* ignore */
  }
  return FALLBACK_PER_USDT[fiat];
}

export function cachedArsPerUsdt(): number {
  return cachedPerUsdt("ARS");
}

export function blueAt(iso: string, live = FALLBACK_ARS_PER_USDT): number {
  const month = iso.slice(0, 7);
  return BLUE_MONTH[month] ?? live;
}

export function receiptRate(
  receipt: { arsPerUsdt?: number; at: string },
  live = FALLBACK_ARS_PER_USDT,
): number {
  if (receipt.arsPerUsdt && receipt.arsPerUsdt > 0) return receipt.arsPerUsdt;
  return blueAt(receipt.at, live);
}
