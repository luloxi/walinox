import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "onramp"), 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rate limit" }, { status: 429 });
  }
  const secret = process.env.MOONPAY_SECRET_KEY?.trim();
  if (!secret) {
    return NextResponse.json({ error: "signing disabled" }, { status: 501 });
  }

  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const raw = body.url?.trim();
  if (!raw || !raw.startsWith("https://buy")) {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.endsWith("moonpay.com")) {
      return NextResponse.json({ error: "host" }, { status: 400 });
    }
    const signature = createHmac("sha256", secret).update(parsed.search).digest("base64");
    parsed.searchParams.set("signature", signature);
    return NextResponse.json({ url: parsed.toString() });
  } catch {
    return NextResponse.json({ error: "sign failed" }, { status: 500 });
  }
}
