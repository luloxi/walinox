import { NextResponse } from "next/server";
import { publicVapidKey } from "@/lib/send-push";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ publicKey: publicVapidKey() });
}
