import { NextResponse } from "next/server";
import { isAddress } from "ethers";
import { drainInbox } from "@/lib/send-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address") ?? "";
  if (!isAddress(address)) {
    return NextResponse.json({ error: "bad address" }, { status: 400 });
  }
  return NextResponse.json(
    { items: drainInbox(address) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
