"use client";

import { ACTION_LABEL, type Receipt } from "@/lib/receipts";
import { amountUsdt } from "@/lib/activity";
import { isTxHash } from "@/lib/etherscan";
import { EtherscanAddressLink, EtherscanTxLink } from "@/components/etherscan-link";
import { Price } from "@/components/price";

export function ActivityList({ receipts, empty }: { receipts: Receipt[]; empty: string }) {
  if (receipts.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {receipts.map((receipt) => (
        <li
          key={receipt.id}
          className="rounded-2xl border border-border bg-card px-3 py-3"
        >
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="font-medium">
              {ACTION_LABEL[receipt.action]}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                · {receipt.channel === "online" ? "on-chain" : receipt.channel}
              </span>
            </span>
            <Price usdt={amountUsdt(receipt.value)} size="sm" className="items-end" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <EtherscanAddressLink address={receipt.owner} />
            {" → "}
            <EtherscanAddressLink address={receipt.spender} />
          </p>
          <time className="mt-1 block text-[11px] text-muted-foreground">
            {new Date(receipt.at).toLocaleString()}
          </time>
          {isTxHash(receipt.signature) ? (
            <EtherscanTxLink hash={receipt.signature} className="mt-2 text-xs" />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
