import { NextResponse } from "next/server";
import { isAddress } from "ethers";
import { readBalances } from "@/lib/balance";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(clientKey(request, "balance"), 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rate limit" }, { status: 429 });
  }
  const address = new URL(request.url).searchParams.get("address") ?? "";
  if (!isAddress(address)) {
    return NextResponse.json({ error: "bad address" }, { status: 400 });
  }
  try {
    const balances = await readBalances(address);
    return NextResponse.json(balances);
  } catch {
    return NextResponse.json({ usdt: null, offline: true });
  }
}
