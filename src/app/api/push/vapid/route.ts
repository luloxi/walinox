import { NextResponse } from "next/server";
import { publicVapidKey } from "@/lib/send-push";
import { vapidConfigured } from "@/lib/vapid";

export const runtime = "nodejs";

export async function GET() {
  if (!vapidConfigured()) {
    return NextResponse.json({ error: "push not configured" }, { status: 503 });
  }
  return NextResponse.json({ publicKey: publicVapidKey() });
}
