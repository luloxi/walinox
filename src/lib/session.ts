import { getAddress, isAddress } from "ethers";
import type { Signable } from "@/lib/wallet";

export const TERMS_VERSION = "2";
export const LOCAL_UNLOCK_KEY = "walinox.useLocal";
export const TOS_STORAGE_KEY = "walinox.tos";

export const TERMS_LINES = [
  "Walinox es auto-custodia: las claves quedan en tu wallet o en este dispositivo. Cada envío y permiso se firma; nadie mueve USDT por vos.",
  "USDT en Ethereum. Los vales NFT son tickets de un bien físico, no un instrumento financiero ni una inversión.",
  "Podés usar la billetera local de Walinox o conectar Rainbow/MetaMask u otra wallet. En ambos casos firmás vos.",
] as const;

export type TosRecord = {
  address: string;
  version: string;
  signature: string;
  at: string;
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

export function isLocalUnlocked(): boolean {
  return readRaw(LOCAL_UNLOCK_KEY) === "1";
}

export function setLocalUnlocked(on: boolean): void {
  if (on) writeRaw(LOCAL_UNLOCK_KEY, "1");
  else if (typeof localStorage !== "undefined") localStorage.removeItem(LOCAL_UNLOCK_KEY);
  else memory.delete(LOCAL_UNLOCK_KEY);
}
