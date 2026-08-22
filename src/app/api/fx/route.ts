import { NextResponse } from "next/server";
import { FALLBACK_ARS_PER_USDT, type FxQuote } from "@/lib/fx";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET() {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/blue", {
      next: { revalidate: 600 },
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { venta?: number; fechaActualizacion?: string };
    const venta = Number(data.venta);
    if (!Number.isFinite(venta) || venta <= 0) throw new Error("bad quote");
    const quote: FxQuote = {
      arsPerUsdt: venta,
      source: "blue",
      at: data.fechaActualizacion ?? new Date().toISOString(),
    };
    return NextResponse.json(quote);
  } catch {
    const quote: FxQuote = {
      arsPerUsdt: FALLBACK_ARS_PER_USDT,
      source: "fallback",
      at: new Date().toISOString(),
    };
    return NextResponse.json(quote);
  }
}
