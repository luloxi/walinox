import { NextResponse } from "next/server";
import { isAddress } from "ethers";
import { saveSubscription } from "@/lib/send-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    address?: string;
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  };
  const address = body.address?.trim() ?? "";
  const endpoint = body.subscription?.endpoint?.trim() ?? "";
  const p256dh = body.subscription?.keys?.p256dh ?? "";
  const auth = body.subscription?.keys?.auth ?? "";

  if (!isAddress(address) || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "address and subscription required" }, { status: 400 });
  }

  saveSubscription(address, { endpoint, keys: { p256dh, auth } });
  return NextResponse.json({ ok: true });
}
