import type { Channel } from "@/lib/channels";

export type ReceiptAction = "created" | "signed" | "sent" | "received";

export const ACTION_LABEL: Record<ReceiptAction, string> = {
  created: "Borrador",
  signed: "Firmaste",
  sent: "Enviaste",
  received: "Recibiste",
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

export function listReceipts(): Receipt[] {
  return currentStore().load();
}

export function addReceipt(
  input: Omit<Receipt, "id" | "at"> & { id?: string; at?: string },
): Receipt {
  const receipt: Receipt = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    at: input.at ?? new Date().toISOString(),
  };
  const current = currentStore();
  const next = [receipt, ...current.load()];
  current.save(next);
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
