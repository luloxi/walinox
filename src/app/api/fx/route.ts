import { NextResponse } from "next/server";
import { isFiatId, type FiatId } from "@/lib/display";
import { FALLBACK_PER_USDT, type FxQuote } from "@/lib/fx";

export const runtime = "nodejs";
export const revalidate = 300;

type Row = {
  moneda?: string;
  moeda?: string;
  casa?: string;
  fuente?: string;
  venta?: number;
  venda?: number;
  promedio?: number;
  compra?: number;
  fechaActualizacion?: string;
  dataAtualizacao?: string;
};

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
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function usdRow(rows: Row[]): Row | undefined {
  return rows.find((row) => (row.moneda ?? row.moeda) === "USD");
}

async function fromDolarApi(fiat: FiatId): Promise<FxQuote | null> {
  if (fiat === "ARS") {
    const data = (await fromJson("https://dolarapi.com/v1/dolares/blue")) as Row;
    return asQuote(fiat, num(data.venta), "blue", data.fechaActualizacion);
  }
  if (fiat === "VES") {
    const rows = (await fromJson("https://ve.dolarapi.com/v1/dolares")) as Row[];
    const row = rows.find((item) => item.fuente === "paralelo") ?? rows[0];
    if (!row) return null;
    return asQuote(fiat, num(row.promedio, row.venta), "paralelo", row.fechaActualizacion);
  }
  if (fiat === "BRL") {
    const rows = (await fromJson("https://br.dolarapi.com/v1/cotacoes")) as Row[];
    const row = usdRow(rows);
    if (!row) return null;
    return asQuote(fiat, num(row.venda, row.venta), "USD", row.dataAtualizacao ?? row.fechaActualizacion);
  }
  const host: Partial<Record<FiatId, string>> = {
    CLP: "https://cl.dolarapi.com/v1/cotizaciones",
    UYU: "https://uy.dolarapi.com/v1/cotizaciones",
    MXN: "https://mx.dolarapi.com/v1/cotizaciones",
    COP: "https://co.dolarapi.com/v1/cotizaciones",
  };
  const url = host[fiat];
  if (!url) return null;
  const rows = (await fromJson(url)) as Row[];
  const row = usdRow(rows);
  if (!row) return null;
  return asQuote(fiat, num(row.venta, row.venda, row.promedio), "USD", row.fechaActualizacion);
}

async function fromOpenEr(fiat: FiatId): Promise<FxQuote | null> {
  const data = (await fromJson("https://open.er-api.com/v6/latest/USD")) as {
    rates?: Record<string, number>;
    time_last_update_utc?: string;
  };
  const rate = data.rates?.[fiat];
  return asQuote(fiat, num(rate), "tipo de cambio", data.time_last_update_utc);
}

async function quoteFiat(fiat: FiatId): Promise<FxQuote> {
  if (fiat === "USD") {
    return { fiat, perUsdt: 1, source: "paridad", at: new Date().toISOString() };
  }
  try {
    const regional = await fromDolarApi(fiat);
    if (regional) return regional;
  } catch {
    /* try a general USD book */
  }
  try {
    const global = await fromOpenEr(fiat);
    if (global) return global;
  } catch {
    /* fallback */
  }
  return {
    fiat,
    perUsdt: FALLBACK_PER_USDT[fiat],
    source: "fallback",
    at: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const fiatParam = new URL(request.url).searchParams.get("fiat") ?? "ARS";
  const fiat: FiatId = isFiatId(fiatParam) ? fiatParam : "ARS";
  const quote = await quoteFiat(fiat);
  return NextResponse.json(quote);
}
