"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityList } from "@/components/activity-list";
import { WalletCard } from "@/components/wallet-card";
import {
  generateMonthlySummary,
  listReceipts,
  type MonthlySummary,
} from "@/lib/receipts";

export function SummaryView() {
  const [summary, setSummary] = useState<MonthlySummary>(() =>
    generateMonthlySummary([]),
  );

  useEffect(() => {
    setSummary(generateMonthlySummary(listReceipts()));
  }, []);

  const stats = [
    ["Este mes", String(summary.count)],
    ["Firmas", String(summary.signed)],
    ["Envíos", String(summary.sent)],
    ["Recibidos", String(summary.received)],
  ];

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-3xl flex-col gap-5 overflow-y-auto md:grid md:grid-cols-2 md:overflow-hidden">
    <div className="shrink-0 md:h-full">
      <WalletCard />
    </div>
    <div className="min-h-0 space-y-5 md:overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle>{summary.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/5 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-lg font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <section className="space-y-2">
        <ActivityList receipts={summary.receipts} empty="Nada este mes." />
      </section>
    </div>
    </div>
  );
}
