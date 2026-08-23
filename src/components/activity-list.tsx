"use client";

import { History, RotateCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type Receipt, removeReceipt } from "@/lib/receipts";
import { amountUsdt, receiptActionLabel } from "@/lib/activity";
import { formatFiat, receiptRate } from "@/lib/fx";
import { isTxHash } from "@/lib/etherscan";
import { EtherscanAddressLink, EtherscanTxLink } from "@/components/etherscan-link";
import { EmptyState } from "@/components/empty-state";
import { Price } from "@/components/price";
import { Button } from "@/components/ui/button";
import { useDisplay } from "@/components/display-provider";
import { useFx } from "@/components/use-fx";
import { useWallet } from "@/components/wallet-provider";
import { fiatMeta } from "@/lib/display";

export function ActivityList({ receipts, empty }: { receipts: Receipt[]; empty: string }) {
  const router = useRouter();
  const { wallet } = useWallet();
  const { prefs } = useDisplay();
  const fx = useFx();
  if (receipts.length === 0) {
    return <EmptyState icon={History} title={empty} body="Cuando envíes o recibas, aparecen acá." />;
  }
  return (
    <ul className="space-y-2">
      {receipts.map((receipt) => {
        const rate = prefs.fiat === "ARS" ? receiptRate(receipt, fx.perUsdt) : fx.perUsdt;
        const failed = receipt.action === "failed";
        return (
          <li key={receipt.id} className="rounded-2xl border border-border bg-card px-3 py-3">
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className={failed ? "font-medium text-destructive" : "font-medium"}>
                {receiptActionLabel(receipt, wallet?.address)}
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
            {failed && receipt.error ? (
              <p className="mt-1 text-xs text-destructive">{receipt.error}</p>
            ) : null}
            {isTxHash(receipt.signature) ? (
              <EtherscanTxLink hash={receipt.signature} className="mt-2 text-xs" />
            ) : null}
            {failed ? (
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 flex-1"
                  onClick={() => {
                    const params = new URLSearchParams({
                      tab: "enviar",
                      to: receipt.spender,
                      amount: String(amountUsdt(receipt.value)),
                    });
                    router.push(`/?${params.toString()}`);
                  }}
                >
                  <RotateCw className="size-3.5" />
                  Reintentar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 flex-1 text-destructive hover:text-destructive"
                  onClick={() => removeReceipt(receipt.id)}
                >
                  <Trash2 className="size-3.5" />
                  Quitar
                </Button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
