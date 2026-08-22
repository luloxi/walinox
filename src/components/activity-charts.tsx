"use client";

import type { ActivityReport, Bucket } from "@/lib/activity";
import { formatFiat, formatUsdt, usdtToFiat } from "@/lib/fx";
import { useDisplay } from "@/components/display-provider";
import { useFx } from "@/components/use-fx";
import type { FiatId } from "@/lib/display";

function money(value: number, rate: number, fiat: FiatId): string {
  return `${formatFiat(usdtToFiat(value, rate), fiat)} · ${formatUsdt(value)}`;
}

function moneyAt(usdt: number, ars: number, fiat: FiatId): string {
  return `${formatFiat(ars, fiat)} · ${formatUsdt(usdt)}`;
}

function BarPair({ buckets, fiat }: { buckets: Bucket[]; fiat: FiatId }) {
  const max = Math.max(1, ...buckets.map((item) => Math.max(item.income, item.expense)));
  if (buckets.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay movimientos en este período.</p>;
  }
  return (
    <div className="flex h-36 items-end gap-1.5">
      {buckets.map((bucket) => (
        <div key={bucket.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="flex h-28 w-full items-end justify-center gap-0.5">
            <div
              className="w-1/2 rounded-t-sm bg-primary"
              style={{ height: `${Math.max(2, (bucket.income / max) * 100)}%` }}
              title={`Ingresos ${moneyAt(bucket.income, bucket.incomeArs, fiat)}`}
            />
            <div
              className="w-1/2 rounded-t-sm bg-muted-foreground/40"
              style={{ height: `${Math.max(2, (bucket.expense / max) * 100)}%` }}
              title={`Gastos ${moneyAt(bucket.expense, bucket.expenseArs, fiat)}`}
            />
          </div>
          <span className="w-full truncate text-center text-[10px] text-muted-foreground">{bucket.label}</span>
        </div>
      ))}
    </div>
  );
}

function SplitBar({
  left,
  right,
  leftLabel,
  rightLabel,
  rate,
  fiat,
}: {
  left: number;
  right: number;
  leftLabel: string;
  rightLabel: string;
  rate: number;
  fiat: FiatId;
}) {
  const total = left + right;
  const leftPct = total > 0 ? (left / total) * 100 : 50;
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        <div className="bg-primary" style={{ width: `${leftPct}%` }} />
        <div className="bg-muted-foreground/40" style={{ width: `${100 - leftPct}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>
          {leftLabel} {money(left, rate, fiat)}
        </span>
        <span>
          {rightLabel} {money(right, rate, fiat)}
        </span>
      </div>
    </div>
  );
}

export function ActivityCharts({ report }: { report: ActivityReport }) {
  const { prefs } = useDisplay();
  const fx = useFx();
  const rate = fx.perUsdt;
  const fiat = prefs.fiat;
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium">Ingresos y gastos</p>
        <div className="mb-2 flex gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-primary" /> Ingresos
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-muted-foreground/40" /> Gastos
          </span>
        </div>
        <BarPair buckets={report.buckets} fiat={fiat} />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Tienda vs personal</p>
        <SplitBar
          left={report.store}
          right={report.personal}
          leftLabel="Tienda"
          rightLabel="Personal"
          rate={rate}
          fiat={fiat}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <p>
          Tienda +{money(report.storeIncome, rate, fiat)} / −{money(report.storeExpense, rate, fiat)}
        </p>
        <p className="text-right">
          Personal +{money(report.personalIncome, rate, fiat)} / −{money(report.personalExpense, rate, fiat)}
        </p>
      </div>
    </div>
  );
}
