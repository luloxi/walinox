import { NextResponse } from "next/server";
import { publicVapidKey } from "@/lib/send-push";
import { vapidConfigured } from "@/lib/vapid";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(clientKey(request, "vapid"), 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rate limit" }, { status: 429 });
  }
  if (!vapidConfigured()) {
    return NextResponse.json({ error: "push not configured" }, { status: 503 });
  }
  return NextResponse.json({ publicKey: publicVapidKey() });
}
