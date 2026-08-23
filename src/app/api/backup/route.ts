import { NextResponse } from "next/server";
import { getAddress, isAddress } from "ethers";
import { parsePayload, payloadDigest } from "@/lib/backup";
import { getPrisma } from "@/lib/prisma";
import { verifyPushAuth } from "@/lib/push-auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  address?: string;
  ts?: number;
  signature?: string;
  extra?: string;
  action?: string;
  payload?: unknown;
};

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "backup"), 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "rate limit" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000) || 1) } },
    );
  }

  const bytes = Number(request.headers.get("content-length"));
  if (Number.isFinite(bytes) && bytes > 900_000) {
    return NextResponse.json({ error: "copia grande" }, { status: 413 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "sin base" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "pedido inválido" }, { status: 400 });
  }
  const address = body.address?.trim() ?? "";
  const action = body.action?.trim() ?? "";
  const ts = Number(body.ts);
  const signature = body.signature?.trim() ?? "";
  const extra = body.extra?.trim() ?? "";

  if (!isAddress(address) || (action !== "backup" && action !== "restore")) {
    return NextResponse.json({ error: "pedido inválido" }, { status: 400 });
  }

  const proof = verifyPushAuth({ address, action, ts, signature, extra });
  if (!proof.ok) {
    return NextResponse.json({ error: proof.reason }, { status: 401 });
  }

  const owner = getAddress(address);

  if (action === "restore") {
    try {
      const row = await prisma.cloudBackup.findUnique({ where: { address: owner } });
      if (!row) return NextResponse.json({ empty: true });
      return NextResponse.json({ payload: row.payload, updatedAt: row.updatedAt.toISOString() });
    } catch {
      return NextResponse.json({ error: "no se pudo leer" }, { status: 502 });
    }
  }

  const payload = parsePayload(body.payload);
  if (!payload) {
    return NextResponse.json({ error: "copia inválida" }, { status: 400 });
  }
  if (payloadDigest(payload) !== extra) {
    return NextResponse.json({ error: "firma no cubre la copia" }, { status: 400 });
  }
  for (const product of payload.products) {
    if (product.issuer.toLowerCase() !== owner.toLowerCase()) {
      return NextResponse.json({ error: "producto ajeno" }, { status: 400 });
    }
  }

  try {
    const row = await prisma.cloudBackup.upsert({
      where: { address: owner },
      create: { address: owner, payload },
      update: { payload },
    });
    return NextResponse.json({ ok: true, updatedAt: row.updatedAt.toISOString() });
  } catch {
    return NextResponse.json({ error: "no se pudo guardar" }, { status: 502 });
  }
}
