"use client";

import { ACTION_LABEL, type Receipt } from "@/lib/receipts";
import { formatTokenAmount, shortAddress } from "@/lib/format";

export function ActivityList({ receipts, empty }: { receipts: Receipt[]; empty: string }) {
  if (receipts.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {receipts.map((receipt) => (
        <li
          key={receipt.id}
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3"
        >
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">
              {ACTION_LABEL[receipt.action]}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                · {receipt.channel === "online" ? "on-chain" : receipt.channel}
              </span>
            </span>
            <time className="text-[11px] text-muted-foreground">
              {new Date(receipt.at).toLocaleString()}
            </time>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {shortAddress(receipt.owner)} → {shortAddress(receipt.spender)} ·{" "}
            {formatTokenAmount(receipt.value, 6, receipt.token.includes("0x") ? "token" : receipt.token)}
          </p>
        </li>
      ))}
    </ul>
  );
}
