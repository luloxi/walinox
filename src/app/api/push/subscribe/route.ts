import { NextResponse } from "next/server";
import { isAddress } from "ethers";
import { verifyPushAuth } from "@/lib/push-auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { saveSubscription } from "@/lib/send-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "push-sub"), 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rate limit" }, { status: 429 });
  }

  const body = (await request.json()) as {
    address?: string;
    ts?: number;
    signature?: string;
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  };
  const address = body.address?.trim() ?? "";
  const endpoint = body.subscription?.endpoint?.trim() ?? "";
  const p256dh = body.subscription?.keys?.p256dh ?? "";
  const auth = body.subscription?.keys?.auth ?? "";
  const ts = Number(body.ts);
  const signature = body.signature?.trim() ?? "";

  if (!isAddress(address) || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "address and subscription required" }, { status: 400 });
  }

  const proof = verifyPushAuth({
    address,
    action: "subscribe",
    ts,
    signature,
    extra: endpoint,
  });
  if (!proof.ok) {
    return NextResponse.json({ error: proof.reason }, { status: 401 });
  }

  saveSubscription(address, { endpoint, keys: { p256dh, auth } });
  return NextResponse.json({ ok: true });
}
