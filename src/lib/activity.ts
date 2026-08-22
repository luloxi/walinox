import { fromBaseUnits } from "@/lib/format";
import type { Receipt } from "@/lib/receipts";

export type PeriodKind = "month" | "quarter" | "year" | "all";
export type FlowKind = "in" | "out" | "none";
export type OriginKind = "tienda" | "personal";

export type Bucket = {
  key: string;
  label: string;
  income: number;
  expense: number;
  store: number;
  personal: number;
};

export type ActivityReport = {
  kind: PeriodKind;
  label: string;
  from: Date;
  to: Date;
  receipts: Receipt[];
  income: number;
  expense: number;
  net: number;
  store: number;
  personal: number;
  storeIncome: number;
  storeExpense: number;
  personalIncome: number;
  personalExpense: number;
  buckets: Bucket[];
};

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function amountUsdt(value: string): number {
  if (!value) return 0;
  const trimmed = value.trim();
  if (trimmed.includes(".")) return Number(trimmed) || 0;
  if (/^\d+$/.test(trimmed) && trimmed.length > 6) return Number(fromBaseUnits(trimmed, 6)) || 0;
  return Number(trimmed) || 0;
}

export function receiptFlow(receipt: Receipt, me?: string): FlowKind {
  if (receipt.action === "created" || receipt.action === "redeemed") return "none";
  const mine = me?.toLowerCase();
  const owner = receipt.owner.toLowerCase();
  const spender = receipt.spender.toLowerCase();
  if (receipt.action === "sent" || receipt.action === "signed") {
    if (mine && spender === mine && owner !== mine) return "in";
    if (!mine || owner === mine) return "out";
    return "none";
  }
  if (receipt.action === "received") {
    if (!mine || spender === mine) return "in";
    if (owner === mine) return "out";
    return "none";
  }
  if (receipt.action === "issued") {
    if (mine && owner === mine) return "in";
    if (mine && spender === mine) return "out";
    return "out";
  }
  return "none";
}

export function receiptOrigin(receipt: Receipt, storeIssuers: string[] = [], me?: string): OriginKind {
  if (receipt.action === "issued" || receipt.action === "redeemed") return "tienda";
  if (receipt.token.toUpperCase() === "VALE") return "tienda";
  const stores = new Set(storeIssuers.map((item) => item.toLowerCase()));
  const mine = me?.toLowerCase();
  const owner = receipt.owner.toLowerCase();
  const spender = receipt.spender.toLowerCase();
  const counterpart = mine && owner === mine ? spender : mine && spender === mine ? owner : null;
  if (counterpart) return stores.has(counterpart) ? "tienda" : "personal";
  if (stores.has(owner) || stores.has(spender)) return "tienda";
  return "personal";
}

export function shiftAnchor(anchor: Date, kind: PeriodKind, delta: number): Date {
  const next = new Date(anchor);
  if (kind === "month") next.setMonth(next.getMonth() + delta);
  else if (kind === "quarter") next.setMonth(next.getMonth() + delta * 3);
  else if (kind === "year") next.setFullYear(next.getFullYear() + delta);
  return next;
}

export function periodBounds(kind: PeriodKind, anchor: Date): { from: Date; to: Date; label: string } {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  if (kind === "all") {
    return { from: new Date(0), to: new Date("9999-12-31T23:59:59.000Z"), label: "Todo" };
  }
  if (kind === "year") {
    return {
      from: new Date(year, 0, 1),
      to: new Date(year, 11, 31, 23, 59, 59, 999),
      label: String(year),
    };
  }
  if (kind === "quarter") {
    const q = Math.floor(month / 3);
    const start = q * 3;
    return {
      from: new Date(year, start, 1),
      to: new Date(year, start + 3, 0, 23, 59, 59, 999),
      label: `T${q + 1} ${year}`,
    };
  }
  return {
    from: new Date(year, month, 1),
    to: new Date(year, month + 1, 0, 23, 59, 59, 999),
    label: `${MONTHS[month]} ${year}`,
  };
}

function inRange(at: Date, from: Date, to: Date): boolean {
  return at >= from && at <= to;
}

function monthKey(at: Date): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(at: Date): string {
  return `${MONTHS[at.getMonth()].slice(0, 3)} ${at.getFullYear()}`;
}

export function buildActivityReport(
  receipts: Receipt[],
  opts: { kind: PeriodKind; anchor?: Date; me?: string; storeIssuers?: string[] },
): ActivityReport {
  const anchor = opts.anchor ?? new Date();
  const { from, to, label } = periodBounds(opts.kind, anchor);
  const filtered = receipts
    .filter((receipt) => inRange(new Date(receipt.at), from, to))
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at));

  let income = 0;
  let expense = 0;
  let storeIncome = 0;
  let storeExpense = 0;
  let personalIncome = 0;
  let personalExpense = 0;

  const bucketMap = new Map<string, Bucket>();

  function bucketFor(at: Date): Bucket {
    const key = monthKey(at);
    const existing = bucketMap.get(key);
    if (existing) return existing;
    const created: Bucket = {
      key,
      label: monthLabel(at),
      income: 0,
      expense: 0,
      store: 0,
      personal: 0,
    };
    bucketMap.set(key, created);
    return created;
  }

  for (const receipt of filtered) {
    const amount = amountUsdt(receipt.value);
    const flow = receiptFlow(receipt, opts.me);
    const origin = receiptOrigin(receipt, opts.storeIssuers, opts.me);
    const at = new Date(receipt.at);
    const bucket = bucketFor(at);
    if (flow === "in") {
      income += amount;
      bucket.income += amount;
      if (origin === "tienda") {
        storeIncome += amount;
        bucket.store += amount;
      } else {
        personalIncome += amount;
        bucket.personal += amount;
      }
    } else if (flow === "out") {
      expense += amount;
      bucket.expense += amount;
      if (origin === "tienda") {
        storeExpense += amount;
        bucket.store += amount;
      } else {
        personalExpense += amount;
        bucket.personal += amount;
      }
    }
  }

  const buckets = [...bucketMap.values()].sort((a, b) => a.key.localeCompare(b.key));

  return {
    kind: opts.kind,
    label,
    from,
    to,
    receipts: filtered,
    income,
    expense,
    net: income - expense,
    store: storeIncome + storeExpense,
    personal: personalIncome + personalExpense,
    storeIncome,
    storeExpense,
    personalIncome,
    personalExpense,
    buckets,
  };
}
