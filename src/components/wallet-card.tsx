"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { shortAddress } from "@/lib/format";
import { useWallet } from "@/components/wallet-provider";
import { useUsdtBalance } from "@/components/use-usdt-balance";
import { Price } from "@/components/price";

export function WalletCard({ children }: { children?: ReactNode }) {
  const { wallet } = useWallet();
  const [copied, setCopied] = useState(false);
  const { usdt } = useUsdtBalance(wallet?.address);

  const address = wallet?.address;
  if (!address) {
    return (
      <div className="flex min-h-24 items-center rounded-2xl bg-card p-4 ring-1 ring-border">
        <p className="text-sm text-muted-foreground">Conectá una wallet para ver el saldo.</p>
      </div>
    );
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex flex-col rounded-2xl bg-gradient-to-br from-primary/15 to-card p-4 ring-1 ring-border md:p-5">
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-muted-foreground hover:bg-muted/80"
          onClick={() => void copy(address)}
          aria-label={copied ? "Address copiada" : "Copiar address"}
        >
          <span className="font-mono text-sm">{shortAddress(address)}</span>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      <div className="mt-2">
        {usdt == null ? (
          <p className="text-3xl font-semibold">—</p>
        ) : (
          <Price usdt={usdt} size="lg" />
        )}
      </div>
      {children}
    </div>
  );
}
