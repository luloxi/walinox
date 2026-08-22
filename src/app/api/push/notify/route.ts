import { NextResponse } from "next/server";
import { isAddress } from "ethers";
import { buildNotify, type NotifyKind } from "@/lib/notify";
import { dispatchNotify } from "@/lib/send-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = new Set<NotifyKind>(["usdt", "vale", "redeemed", "ping", "permit", "incoming"]);

export async function POST(request: Request) {
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
  };

  const from = body.from?.trim() ?? "";
  const to = body.to?.trim() ?? "";
  const kind = (body.kind ?? "ping") as NotifyKind;

  if (!isAddress(from) || !isAddress(to) || !KINDS.has(kind)) {
    return NextResponse.json({ error: "from, to and kind required" }, { status: 400 });
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
