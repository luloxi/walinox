import type { Channel } from "@/lib/channels";
import { rateAt, cachedArsPerUsdt } from "@/lib/fx";

export type ReceiptAction = "created" | "signed" | "sent" | "received" | "issued" | "redeemed";

export const ACTION_LABEL: Record<ReceiptAction, string> = {
  created: "Borrador",
  signed: "Firmaste",
  sent: "Enviaste",
  received: "Recibiste",
  issued: "Emitiste vale",
  redeemed: "Canjeaste vale",
};

export type Receipt = {
  id: string;
  at: string;
  action: ReceiptAction;
  channel: Channel;
  owner: string;
  spender: string;
  value: string;
  token: string;
  signature: string;
  valid?: boolean;
  digest?: string;
  /** Unidades de moneda local por 1 USDT al momento del movimiento. */
  arsPerUsdt?: number;
};

export type ReceiptStore = {
  load: () => Receipt[];
  save: (receipts: Receipt[]) => void;
};

export type MonthlySummary = {
  year: number;
  month: number;
  label: string;
  count: number;
  usdtIn: number;
  usdtOut: number;
  arsIn: number;
  arsOut: number;
};

const STORAGE_KEY = "walinox.receipts";

export function memoryReceiptStore(seed: Receipt[] = []): ReceiptStore {
  let rows = [...seed];
  return {
    load: () => rows,
    save: (next) => {
      rows = [...next];
    },
  };
}

export function localStorageReceiptStore(key = STORAGE_KEY): ReceiptStore {
  return {
    load() {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as Receipt[]) : [];
      } catch {
        return [];
      }
    },
    save(receipts) {
      localStorage.setItem(key, JSON.stringify(receipts));
    },
  };
}

let store: ReceiptStore = memoryReceiptStore();

export function setReceiptStore(next: ReceiptStore): void {
  store = next;
}

function currentStore(): ReceiptStore {
  if (typeof window !== "undefined") return localStorageReceiptStore();
  return store;
}

export function listReceipts(): Receipt[] {
  return currentStore()
    .load()
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((row) => {
      if (row.arsPerUsdt && row.arsPerUsdt > 0) return row;
      return { ...row, arsPerUsdt: rateAt(row.at, cachedArsPerUsdt()) };
    });
}

export function replaceReceiptsFor(address: string, receipts: Receipt[]): void {
  const key = address.toLowerCase();
  const current = currentStore();
  const others = current.load().filter(
    (item) => item.owner.toLowerCase() !== key && item.spender.toLowerCase() !== key,
  );
  const mine = receipts.filter(
    (item) => item.owner.toLowerCase() === key || item.spender.toLowerCase() === key,
  );
  current.save([...mine, ...others]);
}

export function addReceipt(
  input: Omit<Receipt, "id" | "at"> & { id?: string; at?: string; arsPerUsdt?: number },
): Receipt {
  const at = input.at ?? new Date().toISOString();
  const row: Receipt = {
    id: input.id ?? `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at,
    action: input.action,
    channel: input.channel,
    owner: input.owner,
    spender: input.spender,
    value: input.value,
    token: input.token,
    signature: input.signature,
    valid: input.valid,
    digest: input.digest,
    arsPerUsdt:
      input.arsPerUsdt && input.arsPerUsdt > 0 ? input.arsPerUsdt : rateAt(at, cachedArsPerUsdt()),
  };
  const current = currentStore();
  current.save([row, ...current.load()]);
  return row;
}
