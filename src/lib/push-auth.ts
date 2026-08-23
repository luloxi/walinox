import { getAddress, isAddress, verifyTypedData } from "ethers";
import type { Signable } from "@/lib/wallet";

const MAX_SKEW_MS = 5 * 60 * 1000;

const DOMAIN = {
  name: "Walinox",
  version: "1",
  chainId: 1,
  verifyingContract: "0x0000000000000000000000000000000000000001",
} as const;

const TYPES = {
  PushAuth: [
    { name: "action", type: "string" },
    { name: "account", type: "address" },
    { name: "ts", type: "uint256" },
    { name: "extra", type: "string" },
  ],
};

export function pushAuthTypedData(
  address: string,
  action: string,
  ts: number,
  extra = "",
): Signable {
  return {
    domain: { ...DOMAIN },
    types: TYPES,
    message: {
      action,
      account: getAddress(address),
      ts: String(ts),
      extra,
    },
  };
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
  if (Math.abs(Date.now() - input.ts) > MAX_SKEW_MS) return { ok: false, reason: "firma vencida" };
  try {
    const typed = pushAuthTypedData(input.address, input.action, input.ts, input.extra ?? "");
    const recovered = getAddress(
      verifyTypedData(typed.domain, typed.types, typed.message, input.signature),
    );
    if (recovered !== getAddress(input.address)) {
      return { ok: false, reason: "firma no coincide" };
    }
    return { ok: true, address: recovered };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "firma inválida" };
  }
}
