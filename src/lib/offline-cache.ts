/** Client-side snapshots for airplane-mode UX. Seed never goes here. */

const BALANCE_PREFIX = "walinox.balance.v1.";

export type CachedBalance = {
  usdt: string;
  at: string;
};

function balanceKey(address: string): string {
  return `${BALANCE_PREFIX}${address.toLowerCase()}`;
}

export function readCachedBalance(address: string): CachedBalance | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(balanceKey(address));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedBalance;
    if (typeof parsed?.usdt !== "string" || typeof parsed?.at !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedBalance(address: string, usdt: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    const payload: CachedBalance = { usdt, at: new Date().toISOString() };
    localStorage.setItem(balanceKey(address), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
