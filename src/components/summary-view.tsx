"use client";

import { useEffect, useMemo, useState } from "react";
import type { Receipt } from "@/lib/receipts";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { ActivityList } from "@/components/activity-list";
import { ActivityCharts } from "@/components/activity-charts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/components/wallet-provider";
import {
  buildActivityReport,
  shiftAnchor,
  type PeriodKind,
} from "@/lib/activity";
import { etherscanAddressActivityUrl } from "@/lib/etherscan";
import { listStores } from "@/lib/catalog";
import { listReceiptsFor } from "@/lib/receipts";
import { seedLivedIn } from "@/lib/seed";
import { Price } from "@/components/price";
import { useFx } from "@/components/use-fx";

const PERIODS: { id: PeriodKind; label: string }[] = [
  { id: "month", label: "Mes" },
  { id: "quarter", label: "Trimestre" },
  { id: "year", label: "Año" },
  { id: "all", label: "Total" },
];

export function SummaryView() {
  const { wallet } = useWallet();
  const [kind, setKind] = useState<PeriodKind>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      seedLivedIn(wallet?.address);
      setReceipts(listReceiptsFor(wallet?.address));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [wallet?.address]);

  const fx = useFx();
  const storeIssuers = useMemo(() => listStores().map((store) => store.issuer), [receipts]);
  const report = useMemo(
    () =>
      buildActivityReport(receipts, {
        kind,
        anchor,
        me: wallet?.address,
        storeIssuers,
        arsPerUsdt: fx.perUsdt,
      }),
    [receipts, kind, anchor, wallet?.address, storeIssuers, fx.perUsdt],
  );

  const personalOut = report.personalExpense + report.storeExpense;
  const moneyStats = [
    ["Ingresos personales", report.personalIncome],
    ["Gastos personales", personalOut],
    ["Ingresos tienda", report.storeIncome],
    ["Neto", report.net, report.netArs],
  ] as const;

  const address = wallet?.address;
  const canShift = kind !== "all";

  return (
    <div className="flex w-full flex-col pb-6">
      <Tabs
        value={kind}
        onValueChange={(value) => {
          setKind(value as PeriodKind);
          setAnchor(new Date());
        }}
      >
        <TabsList>
          {PERIODS.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="cursor-pointer">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="cursor-pointer"
          disabled={!canShift}
          onClick={() => setAnchor((value) => shiftAnchor(value, kind, -1))}
          aria-label="Período anterior"
        >
          <ChevronLeft />
        </Button>
        <p className="text-sm font-medium">{report.label}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="cursor-pointer"
          disabled={!canShift}
          onClick={() => setAnchor((value) => shiftAnchor(value, kind, 1))}
          aria-label="Período siguiente"
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-start">
        <div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            {moneyStats.map(([label, usdt, ars]) => (
              <div key={label} className="rounded-2xl bg-muted px-3 py-2">
                <dt className="text-[11px] text-muted-foreground">{label}</dt>
                <dd>
                  <Price usdt={usdt} ars={ars} size="md" />
                </dd>
              </div>
            ))}
            <div className="rounded-2xl bg-muted px-3 py-2">
              <dt className="text-[11px] text-muted-foreground">Movimientos</dt>
              <dd className="text-lg font-medium tabular-nums">{report.receipts.length}</dd>
            </div>
          </dl>
          <div className="mt-5 rounded-2xl border border-border p-4">
            <ActivityCharts report={report} />
          </div>
        </div>
        <section className="space-y-2">
          <p className="text-sm font-medium">Movimientos</p>
          <ActivityList receipts={report.receipts} empty="Nada en este período" />
        </section>
      </div>

      {address ? (
        <Button asChild variant="outline" className="mt-8 h-11 w-full sm:w-auto">
          <a href={etherscanAddressActivityUrl(address)} target="_blank" rel="noopener noreferrer">
            Ver actividad en Etherscan
            <ExternalLink className="size-4" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}
