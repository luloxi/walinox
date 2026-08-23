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
import type { Product } from "@/lib/vale";

export const CLOUD_BACKUP_AT_KEY = "walinox.cloudBackup.at";

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
    held: asArray(catalogRaw.held).slice(0, 200),
    issued: asArray(catalogRaw.issued).slice(0, 200),
    redeemed: asArray(catalogRaw.redeemed).slice(0, 200),
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
}

export function lastCloudBackupAt(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(CLOUD_BACKUP_AT_KEY);
}
