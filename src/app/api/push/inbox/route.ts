import { NextResponse } from "next/server";
import { isAddress } from "ethers";
import { verifyPushAuth } from "@/lib/push-auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { drainInbox } from "@/lib/send-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "push-inbox"), 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rate limit" }, { status: 429 });
  }

  const body = (await request.json()) as {
    address?: string;
    ts?: number;
    signature?: string;
  };
  const address = body.address?.trim() ?? "";
  if (!isAddress(address)) {
    return NextResponse.json({ error: "bad address" }, { status: 400 });
  }

  const proof = verifyPushAuth({
    address,
    action: "inbox",
    ts: Number(body.ts),
    signature: body.signature?.trim() ?? "",
  });
  if (!proof.ok) {
    return NextResponse.json({ error: proof.reason }, { status: 401 });
  }

  return NextResponse.json(
    { items: drainInbox(address) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
