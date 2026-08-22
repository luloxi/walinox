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
    ["This month", String(summary.count)],
    ["Signed", String(summary.signed)],
    ["Sent", String(summary.sent)],
    ["Received", String(summary.received)],
  ];

  return (
    <div className="space-y-5">
      <WalletCard />
      <Card>
        <CardHeader>
          <CardTitle>{summary.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{summary.prose}</p>
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
        <h2 className="text-sm font-medium">All activity</h2>
        <ActivityList
          receipts={summary.receipts}
          empty="No activity this month. Send a permission from the first tab."
        />
      </section>
    </div>
  );
}
