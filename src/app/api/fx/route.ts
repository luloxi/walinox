import { NextResponse } from "next/server";
import { isFiatId, type FiatId } from "@/lib/display";
import { FALLBACK_PER_USDT, type FxQuote } from "@/lib/fx";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const revalidate = 300;

function num(...values: unknown[]): number {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function asQuote(fiat: FiatId, perUsdt: number, source: string, at?: string): FxQuote | null {
  if (!Number.isFinite(perUsdt) || perUsdt <= 0) return null;
  return { fiat, perUsdt, source, at: at ?? new Date().toISOString() };
}

async function fromJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/** CoinGecko simple price: local units per 1 USDT (tether). */
async function fromCoinGecko(fiat: FiatId): Promise<FxQuote | null> {
  const code = fiat.toLowerCase();
  const data = (await fromJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=${encodeURIComponent(code)}`,
  )) as { tether?: Record<string, number> };
  const rate = data.tether?.[code];
  return asQuote(fiat, num(rate), "coingecko");
}

/** CryptoCompare: USDT → fiat (public, no key for light use). */
async function fromCryptoCompare(fiat: FiatId): Promise<FxQuote | null> {
  const data = (await fromJson(
    `https://min-api.cryptocompare.com/data/price?fsym=USDT&tsyms=${encodeURIComponent(fiat)}`,
  )) as Record<string, number>;
  return asQuote(fiat, num(data[fiat]), "cryptocompare");
}

/** USD book as last resort (1 USDT ≈ 1 USD). */
async function fromOpenEr(fiat: FiatId): Promise<FxQuote | null> {
  const data = (await fromJson("https://open.er-api.com/v6/latest/USD")) as {
    rates?: Record<string, number>;
    time_last_update_utc?: string;
  };
  const rate = data.rates?.[fiat];
  return asQuote(fiat, num(rate), "usd-book", data.time_last_update_utc);
}

async function quoteFiat(fiat: FiatId): Promise<FxQuote> {
  if (fiat === "USD") {
    return { fiat, perUsdt: 1, source: "paridad", at: new Date().toISOString() };
  }
  for (const fn of [fromCoinGecko, fromCryptoCompare, fromOpenEr]) {
    try {
      const quote = await fn(fiat);
      if (quote) return quote;
    } catch {
      /* next source */
    }
  }
  return {
    fiat,
    perUsdt: FALLBACK_PER_USDT[fiat],
    source: "fallback",
    at: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const limited = rateLimit(clientKey(request, "fx"), 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rate limit" }, { status: 429 });
  }
  const fiatParam = new URL(request.url).searchParams.get("fiat") ?? "ARS";
  const fiat: FiatId = isFiatId(fiatParam) ? fiatParam : "ARS";
  const quote = await quoteFiat(fiat);
  return NextResponse.json(quote);
}
