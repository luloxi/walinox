import type { Channel } from "@/lib/channels";
import { blueAt, cachedArsPerUsdt } from "@/lib/fx";

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
  /** Dólar blue venta al momento del movimiento. */
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
  signed: number;
  received: number;
  sent: number;
  channels: Partial<Record<Channel, number>>;
  prose: string;
  receipts: Receipt[];
};

const STORAGE_KEY = "walinox.receipts";

export function memoryStore(seed: Receipt[] = []): ReceiptStore {
  let receipts = [...seed];
  return {
    load: () => receipts,
    save: (next) => {
      receipts = [...next];
    },
  };
}

export function localStorageStore(key = STORAGE_KEY): ReceiptStore {
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

let store: ReceiptStore = memoryStore();

export function setReceiptStore(next: ReceiptStore): void {
  store = next;
}

function currentStore(): ReceiptStore {
  if (typeof window !== "undefined") {
    return localStorageStore();
  }
  return store;
}

function withRates(rows: Receipt[]): Receipt[] {
  let changed = false;
  const next = rows.map((row) => {
    if (row.arsPerUsdt && row.arsPerUsdt > 0) return row;
    changed = true;
    return { ...row, arsPerUsdt: blueAt(row.at, cachedArsPerUsdt()) };
  });
  return changed ? next : rows;
}

export function listReceipts(): Receipt[] {
  const current = currentStore();
  const loaded = current.load();
  const next = withRates(loaded);
  if (next !== loaded) current.save(next);
  return next;
}

export function addReceipt(
  input: Omit<Receipt, "id" | "at"> & { id?: string; at?: string },
): Receipt {
  const current = currentStore();
  const existing = current.load();
  if (input.id) {
    const found = existing.find((row) => row.id === input.id);
    if (found) return found;
  }
  const at = input.at ?? new Date().toISOString();
  const receipt: Receipt = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    at,
    arsPerUsdt:
      input.arsPerUsdt && input.arsPerUsdt > 0 ? input.arsPerUsdt : blueAt(at, cachedArsPerUsdt()),
  };
  current.save([receipt, ...existing]);
  return receipt;
}

export function receiptFromPermit(
  fields: { owner: string; spender: string; value: string; token: string },
  extra: Pick<Receipt, "action" | "channel" | "signature"> &
    Partial<Pick<Receipt, "valid" | "digest" | "id" | "at">>,
): Receipt {
  return addReceipt({
    owner: fields.owner,
    spender: fields.spender,
    value: fields.value,
    token: fields.token,
    ...extra,
  });
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function generateMonthlySummary(
  receipts: Receipt[],
  when: Date = new Date(),
): MonthlySummary {
  const year = when.getFullYear();
  const month = when.getMonth();
  const monthReceipts = receipts.filter((receipt) => {
    const at = new Date(receipt.at);
    return at.getFullYear() === year && at.getMonth() === month;
  });

  const channels: Partial<Record<Channel, number>> = {};
  let signed = 0;
  let received = 0;
  let sent = 0;

  for (const receipt of monthReceipts) {
    channels[receipt.channel] = (channels[receipt.channel] ?? 0) + 1;
    if (receipt.action === "signed") signed += 1;
    if (receipt.action === "received") received += 1;
    if (receipt.action === "sent") sent += 1;
  }

  const channelBits = Object.entries(channels)
    .map(([id, count]) => `${count} via ${id}`)
    .join(", ");

  const label = `${MONTHS[month]} ${year}`;
  const prose =
    monthReceipts.length === 0
      ? `No Walinox activity in ${label}.`
      : `In ${label}, Walinox recorded ${monthReceipts.length} action${monthReceipts.length === 1 ? "" : "s"}: ${signed} signed, ${sent} sent, ${received} received${channelBits ? ` (${channelBits})` : ""}.`;

  return {
    year,
    month,
    label,
    count: monthReceipts.length,
    signed,
    received,
    sent,
    channels,
    prose,
    receipts: monthReceipts,
  };
}
