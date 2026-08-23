import { NextResponse } from "next/server";
import { isAddress } from "ethers";
import { buildNotify, type NotifyKind } from "@/lib/notify";
import { verifyPushAuth } from "@/lib/push-auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { dispatchNotify } from "@/lib/send-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = new Set<NotifyKind>(["usdt", "vale", "redeemed", "ping", "permit", "incoming"]);

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "push-notify"), 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rate limit" }, { status: 429 });
  }

  const body = (await request.json()) as {
    kind?: string;
    from?: string;
    to?: string;
    amount?: string;
    token?: string;
    message?: string;
    url?: string;
    title?: string;
    body?: string;
    id?: string;
    at?: string;
    ts?: number;
    signature?: string;
  };

  const from = body.from?.trim() ?? "";
  const to = body.to?.trim() ?? "";
  const kind = (body.kind ?? "ping") as NotifyKind;

  if (!isAddress(from) || !isAddress(to) || !KINDS.has(kind)) {
    return NextResponse.json({ error: "from, to and kind required" }, { status: 400 });
  }

  const proof = verifyPushAuth({
    address: from,
    action: "notify",
    ts: Number(body.ts),
    signature: body.signature?.trim() ?? "",
    extra: to.toLowerCase(),
  });
  if (!proof.ok) {
    return NextResponse.json({ error: proof.reason }, { status: 401 });
  }

  if (from.toLowerCase() === to.toLowerCase()) {
    return NextResponse.json({ ok: true, delivered: 0, queued: false });
  }

  const built = buildNotify({
    kind,
    from,
    to,
    amount: body.amount,
    token: body.token,
    message: body.message,
    url: body.url,
  });

  try {
    const result = await dispatchNotify({
      ...built,
      title: body.title?.trim() || built.title,
      body: (body.body ?? built.body).slice(0, 280),
      id: body.id?.trim() || crypto.randomUUID(),
      at: body.at || new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "notify failed" },
      { status: 400 },
    );
  }
}
