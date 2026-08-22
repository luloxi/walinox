import { getAddress, isAddress } from "ethers";
import type { Signable } from "@/lib/wallet";

export const TERMS_VERSION = "1";
export const LOCAL_UNLOCK_KEY = "walinox.useLocal";
export const TOS_STORAGE_KEY = "walinox.tos";
export const SIGN_MODE_KEY = "walinox.signMode";
export const GRANT_STORAGE_KEY = "walinox.sessionGrant";

export const TERMS_LINES = [
  "Walinox es auto-custodia: las claves quedan en tu wallet. Nadie mueve USDT por vos salvo que actives el modo rápido de esta sesión.",
  "USDT en Ethereum. Los vales NFT son tickets de un bien físico, no un instrumento financiero ni una inversión.",
  "Podés firmar cada envío, o autorizar esta sesión si tu wallet lo permite.",
] as const;

export type SignMode = "every" | "session";

export type TosRecord = {
  address: string;
  version: string;
  signature: string;
  at: string;
};

export type SessionGrant = {
  address: string;
  expiry: number;
  permissionsContext: string;
};

export function termsText(): string {
  return TERMS_LINES.join(" ");
}

export function termsTypedData(signer: string, chainId: number, acceptedAt: string): Signable {
  if (!isAddress(signer)) throw new Error("Address inválida");
  return {
    domain: {
      name: "Walinox",
      version: TERMS_VERSION,
      chainId,
      verifyingContract: "0x0000000000000000000000000000000000000001",
    },
    types: {
      Terms: [
        { name: "app", type: "string" },
        { name: "signer", type: "address" },
        { name: "version", type: "string" },
        { name: "acceptedAt", type: "string" },
        { name: "text", type: "string" },
      ],
    },
    message: {
      app: "Walinox",
      signer: getAddress(signer),
      version: TERMS_VERSION,
      acceptedAt,
      text: termsText(),
    },
  };
}

const memory = new Map<string, string>();

function readRaw(key: string): string | null {
  if (typeof localStorage !== "undefined") return localStorage.getItem(key);
  return memory.get(key) ?? null;
}

function writeRaw(key: string, value: string): void {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  else memory.set(key, value);
}

function readJson<T>(key: string): T | null {
  const raw = readRaw(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  writeRaw(key, JSON.stringify(value));
}

export function loadTosMap(): Record<string, TosRecord> {
  return readJson<Record<string, TosRecord>>(TOS_STORAGE_KEY) ?? {};
}

export function hasSignedTos(address: string, version = TERMS_VERSION): boolean {
  if (!isAddress(address)) return false;
  const row = loadTosMap()[address.toLowerCase()];
  return Boolean(row && row.version === version && row.signature);
}

export function saveTos(record: TosRecord): void {
  const map = loadTosMap();
  map[record.address.toLowerCase()] = record;
  writeJson(TOS_STORAGE_KEY, map);
}

export function loadSignModeChoice(address: string): SignMode | null {
  const map = readJson<Record<string, SignMode>>(SIGN_MODE_KEY) ?? {};
  const value = map[address.toLowerCase()];
  return value === "session" || value === "every" ? value : null;
}

export function hasChosenSignMode(address: string): boolean {
  return loadSignModeChoice(address) !== null;
}

export function loadSignMode(address: string): SignMode {
  return loadSignModeChoice(address) ?? "every";
}

export function saveSignMode(address: string, mode: SignMode): void {
  const map = readJson<Record<string, SignMode>>(SIGN_MODE_KEY) ?? {};
  map[address.toLowerCase()] = mode;
  writeJson(SIGN_MODE_KEY, map);
}

export function loadGrant(address: string): SessionGrant | null {
  const map = readJson<Record<string, SessionGrant>>(GRANT_STORAGE_KEY) ?? {};
  const row = map[address.toLowerCase()];
  if (!row) return null;
  return isGrantActive(row) ? row : null;
}

export function saveGrant(grant: SessionGrant): void {
  const map = readJson<Record<string, SessionGrant>>(GRANT_STORAGE_KEY) ?? {};
  map[grant.address.toLowerCase()] = grant;
  writeJson(GRANT_STORAGE_KEY, map);
}

export function clearGrant(address: string): void {
  const map = readJson<Record<string, SessionGrant>>(GRANT_STORAGE_KEY) ?? {};
  delete map[address.toLowerCase()];
  writeJson(GRANT_STORAGE_KEY, map);
}

export function isGrantActive(grant: SessionGrant | null, now = Date.now()): boolean {
  if (!grant?.permissionsContext) return false;
  return grant.expiry * 1000 > now;
}

export function isLocalUnlocked(): boolean {
  return readRaw(LOCAL_UNLOCK_KEY) === "1";
}

export function setLocalUnlocked(on: boolean): void {
  if (on) writeRaw(LOCAL_UNLOCK_KEY, "1");
  else if (typeof localStorage !== "undefined") localStorage.removeItem(LOCAL_UNLOCK_KEY);
  else memory.delete(LOCAL_UNLOCK_KEY);
}

export function sessionHoursLeft(grant: SessionGrant | null, now = Date.now()): number {
  if (!isGrantActive(grant, now) || !grant) return 0;
  return Math.max(0, (grant.expiry * 1000 - now) / 3_600_000);
}
