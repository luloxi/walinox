import { getAddress, isAddress, verifyMessage } from "ethers";

const MAX_SKEW_MS = 5 * 60 * 1000;

export function pushAuthMessage(address: string, action: string, ts: number, extra = ""): string {
  const base = `walinox-push:${action}:${getAddress(address).toLowerCase()}:${ts}`;
  return extra ? `${base}:${extra}` : base;
}

export function verifyPushAuth(input: {
  address: string;
  action: string;
  ts: number;
  signature: string;
  extra?: string;
}): { ok: true; address: string } | { ok: false; reason: string } {
  if (!isAddress(input.address)) return { ok: false, reason: "address inválida" };
  if (!input.signature?.startsWith("0x")) return { ok: false, reason: "firma requerida" };
  if (!Number.isFinite(input.ts)) return { ok: false, reason: "timestamp inválido" };
  const age = Math.abs(Date.now() - input.ts);
  if (age > MAX_SKEW_MS) return { ok: false, reason: "firma vencida" };
  try {
    const message = pushAuthMessage(input.address, input.action, input.ts, input.extra);
    const recovered = getAddress(verifyMessage(message, input.signature));
    if (recovered !== getAddress(input.address)) {
      return { ok: false, reason: "firma no coincide" };
    }
    return { ok: true, address: recovered };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "firma inválida" };
  }
}
