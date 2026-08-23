import { getAddress, isAddress, keccak256, toUtf8Bytes } from "ethers";
import {
  catalogSlice,
  listProducts,
  mergeCatalogSlice,
  replaceIssuerProducts,
  type CatalogSlice,
} from "@/lib/catalog";
import { listContacts, replaceContacts, type Contact } from "@/lib/contacts";
import { DEFAULT_DISPLAY, isFiatId, loadDisplay, saveDisplay, type DisplayPrefs } from "@/lib/display";
import { listInbox, replaceInboxFor, type InboxItem } from "@/lib/notify";
import { listReceipts, replaceReceiptsFor, type Receipt } from "@/lib/receipts";
import { isTheme, loadTheme, saveTheme, type Theme } from "@/lib/theme";
import type { Product, RedeemRecord, ValeEnvelope } from "@/lib/vale";

export const CLOUD_BACKUP_AT_KEY = "walinox.cloudBackup.at";
export const CLOUD_BACKUP_EVENT = "walinox.cloud.backup";
export const CLOUD_DIRTY_EVENT = "walinox.cloud.dirty";

export type CloudPayload = {
  v: 1;
  products: Product[];
  contacts: Contact[];
  display: DisplayPrefs;
  theme: Theme;
  receipts: Receipt[];
  inbox: InboxItem[];
  catalog: CatalogSlice;
};

const MAX_JSON = 800_000;

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function payloadDigest(payload: CloudPayload): string {
  return keccak256(toUtf8Bytes(JSON.stringify(payload)));
}

export function parsePayload(raw: unknown): CloudPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (value.v !== 1) return null;
  const products = asArray<Product>(value.products)
    .filter((item) => item && typeof item.id === "string" && isAddress(item.issuer))
    .slice(0, 200);
  const contacts = asArray<Contact>(value.contacts)
    .filter((item) => item && isAddress(item.address))
    .slice(0, 400);
  const displayRaw = (value.display ?? {}) as Partial<DisplayPrefs>;
  const display: DisplayPrefs = {
    fiat: displayRaw.fiat && isFiatId(displayRaw.fiat) ? displayRaw.fiat : DEFAULT_DISPLAY.fiat,
    primary: displayRaw.primary === "usdt" ? "usdt" : "fiat",
  };
  const theme: Theme = isTheme(value.theme as string) ? (value.theme as Theme) : "dark";
  const receipts = asArray<Receipt>(value.receipts)
    .filter((item) => item && typeof item.id === "string")
    .slice(0, 400);
  const inbox = asArray<InboxItem>(value.inbox)
    .filter((item) => item && typeof item.id === "string")
    .slice(0, 80);
  const catalogRaw = (value.catalog ?? {}) as Partial<CatalogSlice>;
  const catalog: CatalogSlice = {
    held: asArray<ValeEnvelope>(catalogRaw.held).slice(0, 200),
    issued: asArray<ValeEnvelope>(catalogRaw.issued).slice(0, 200),
    redeemed: asArray<RedeemRecord>(catalogRaw.redeemed).slice(0, 200),
  };
  const payload: CloudPayload = { v: 1, products, contacts, display, theme, receipts, inbox, catalog };
  if (JSON.stringify(payload).length > MAX_JSON) return null;
  return payload;
}

export function collectCloudPayload(address: string): CloudPayload {
  const me = getAddress(address);
  const key = me.toLowerCase();
  const products = listProducts().filter((item) => item.issuer.toLowerCase() === key);
  const receipts = listReceipts().filter(
    (item) => item.owner.toLowerCase() === key || item.spender.toLowerCase() === key,
  );
  const inbox = listInbox().filter(
    (item) => item.to.toLowerCase() === key || item.from.toLowerCase() === key,
  );
  return {
    v: 1,
    products,
    contacts: listContacts(),
    display: loadDisplay(),
    theme: loadTheme(),
    receipts,
    inbox,
    catalog: catalogSlice(me),
  };
}

export function applyCloudPayload(address: string, payload: CloudPayload): void {
  const me = getAddress(address);
  replaceIssuerProducts(me, payload.products);
  mergeCatalogSlice(me, payload.catalog);
  replaceContacts(payload.contacts);
  replaceReceiptsFor(me, payload.receipts);
  replaceInboxFor(me, payload.inbox);
  saveDisplay(payload.display);
  saveTheme(payload.theme);
}

export function rememberCloudBackupAt(at: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(CLOUD_BACKUP_AT_KEY, at);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CLOUD_BACKUP_EVENT));
  }
}

export function lastCloudBackupAt(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(CLOUD_BACKUP_AT_KEY);
}

export function markCloudDirty(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLOUD_DIRTY_EVENT));
}

export function formatBackupAge(iso: string | null, now = Date.now()): string {
  if (!iso) return "Sin copia en la nube";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "Sin copia en la nube";
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 45) return "Copia hace un momento";
  if (sec < 3600) return `Copia hace ${Math.max(1, Math.floor(sec / 60))} min`;
  if (sec < 86400) return `Copia hace ${Math.floor(sec / 3600)} h`;
  const days = Math.floor(sec / 86400);
  return days === 1 ? "Copia hace 1 día" : `Copia hace ${days} días`;
}

export async function pushCloudBackup(address: string): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  if (!isAddress(address)) return { ok: false, error: "address inválida" };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false, error: "sin internet" };
  }
  const payload = parsePayload(collectCloudPayload(address));
  if (!payload) return { ok: false, error: "copia inválida" };
  try {
    const res = await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, action: "backup", payload }),
    });
    const data = (await res.json()) as { error?: string; updatedAt?: string };
    if (res.status === 503) return { ok: false, error: "sin base" };
    if (!res.ok || !data.updatedAt) return { ok: false, error: data.error || "no se pudo guardar" };
    rememberCloudBackupAt(data.updatedAt);
    return { ok: true, updatedAt: data.updatedAt };
  } catch {
    return { ok: false, error: "red" };
  }
}

export async function pullCloudBackup(
  address: string,
): Promise<{ ok: true; payload: CloudPayload; updatedAt: string } | { ok: false; error: string; empty?: boolean }> {
  if (!isAddress(address)) return { ok: false, error: "address inválida" };
  try {
    const res = await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, action: "restore" }),
    });
    const data = (await res.json()) as {
      error?: string;
      empty?: boolean;
      payload?: unknown;
      updatedAt?: string;
    };
    if (res.status === 503) return { ok: false, error: "sin base" };
    if (!res.ok) return { ok: false, error: data.error || "no se pudo leer" };
    if (data.empty) return { ok: false, error: "vacío", empty: true };
    const payload = parsePayload(data.payload);
    if (!payload || !data.updatedAt) return { ok: false, error: "copia inválida" };
    return { ok: true, payload, updatedAt: data.updatedAt };
  } catch {
    return { ok: false, error: "red" };
  }
}
