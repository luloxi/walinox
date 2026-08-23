"use client";

import { History } from "lucide-react";
import { ACTION_LABEL, type Receipt } from "@/lib/receipts";
import { amountUsdt } from "@/lib/activity";
import { formatFiat, receiptRate } from "@/lib/fx";
import { isTxHash } from "@/lib/etherscan";
import { EtherscanAddressLink, EtherscanTxLink } from "@/components/etherscan-link";
import { EmptyState } from "@/components/empty-state";
import { Price } from "@/components/price";
import { useDisplay } from "@/components/display-provider";
import { useFx } from "@/components/use-fx";
import { fiatMeta } from "@/lib/display";

export function ActivityList({ receipts, empty }: { receipts: Receipt[]; empty: string }) {
  const { prefs } = useDisplay();
  const fx = useFx();
  if (receipts.length === 0) {
    return <EmptyState icon={History} title={empty} body="Cuando envíes o recibas, aparecen acá." />;
  }
  return (
    <ul className="space-y-2">
      {receipts.map((receipt) => {
        const rate = prefs.fiat === "ARS" ? receiptRate(receipt, fx.perUsdt) : fx.perUsdt;
        return (
          <li key={receipt.id} className="rounded-2xl border border-border bg-card px-3 py-3">
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="font-medium">
                {ACTION_LABEL[receipt.action]}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  · {receipt.channel === "online" ? "on-chain" : receipt.channel}
                </span>
              </span>
              <Price usdt={amountUsdt(receipt.value)} rate={rate} size="sm" className="items-end" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <EtherscanAddressLink address={receipt.owner} />
              {" → "}
              <EtherscanAddressLink address={receipt.spender} />
            </p>
            <time className="mt-1 block text-[11px] text-muted-foreground">
              {new Date(receipt.at).toLocaleString()}
              {" · "}
              {fiatMeta(prefs.fiat).source} {formatFiat(rate, prefs.fiat)}
            </time>
            {isTxHash(receipt.signature) ? (
              <EtherscanTxLink hash={receipt.signature} className="mt-2 text-xs" />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
