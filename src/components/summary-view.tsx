"use client";

import { useEffect, useMemo, useState } from "react";
import type { Receipt } from "@/lib/receipts";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { ActivityList } from "@/components/activity-list";
import { ActivityCharts } from "@/components/activity-charts";
import { SectionBar } from "@/components/section-bar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/components/wallet-provider";
import {
  buildActivityReport,
  shiftAnchor,
  type PeriodKind,
} from "@/lib/activity";
import { listStores } from "@/lib/catalog";
import { etherscanAddressActivityUrl } from "@/lib/etherscan";
import { listReceipts } from "@/lib/receipts";
import { seedLivedIn } from "@/lib/seed";
import { Price } from "@/components/price";

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
  const [storeIssuers, setStoreIssuers] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      seedLivedIn(wallet?.address);
      setReceipts(listReceipts());
      setStoreIssuers(listStores().map((store) => store.issuer));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [wallet?.address]);

  const report = useMemo(
    () =>
      buildActivityReport(receipts, {
        kind,
        anchor,
        me: wallet?.address,
        storeIssuers,
      }),
    [receipts, kind, anchor, wallet?.address, storeIssuers],
  );

  const moneyStats = [
    ["Ingresos", report.income],
    ["Gastos", report.expense],
    ["Neto", report.net],
  ] as const;

  const address = wallet?.address;
  const canShift = kind !== "all";

  return (
    <div className="flex w-full flex-col pb-6">
      <SectionBar hint="Ingresos y gastos de este período. Tienda es compra/venta de vales; personal es envío entre wallets." />

      <Tabs
        value={kind}
        onValueChange={(value) => {
          setKind(value as PeriodKind);
          setAnchor(new Date());
        }}
        className="mt-3"
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

      <div className="mt-6 grid gap-8 xl:grid-cols-2 xl:items-start">
        <div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            {moneyStats.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-muted px-3 py-2">
                <dt className="text-[11px] text-muted-foreground">{label}</dt>
                <dd>
                  <Price usdt={value} size="md" />
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
          <ActivityList receipts={report.receipts} empty="Nada en este período." />
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
