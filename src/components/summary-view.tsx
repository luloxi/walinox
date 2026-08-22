"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateMonthlySummary,
  listReceipts,
  type MonthlySummary,
} from "@/lib/receipts";
import { formatTokenAmount, shortAddress } from "@/lib/format";

export function SummaryView() {
  const [summary, setSummary] = useState<MonthlySummary>(() =>
    generateMonthlySummary([]),
  );

  useEffect(() => {
    setSummary(generateMonthlySummary(listReceipts()));
  }, []);

  const stats = [
    ["Actions", String(summary.count)],
    ["Signed", String(summary.signed)],
    ["Sent", String(summary.sent)],
    ["Received", String(summary.received)],
  ];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{summary.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed">{summary.prose}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/5 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-lg font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Receipts</h2>
        {summary.receipts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create or receive a permit this month to fill the log.
          </p>
        ) : (
          <ul className="space-y-2">
            {summary.receipts.map((receipt) => (
              <li
                key={receipt.id}
                className="rounded-xl border border-white/10 px-3 py-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium capitalize">
                    {receipt.action} · {receipt.channel}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(receipt.at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 font-mono text-muted-foreground">
                  {shortAddress(receipt.owner)} → {shortAddress(receipt.spender)} ·{" "}
                  {formatTokenAmount(receipt.value)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
