"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/format";
import { useWallet } from "@/components/wallet-provider";

type Balances = { usdt: string | null; usdc: string | null; offline?: boolean };

export function WalletCard() {
  const { wallet } = useWallet();
  const [copied, setCopied] = useState(false);
  const [balances, setBalances] = useState<Balances | null>(null);

  useEffect(() => {
    if (!wallet) return;
    let live = true;
    fetch(`/api/balance?address=${wallet.address}`)
      .then((res) => res.json())
      .then((data: Balances) => {
        if (live) setBalances(data);
      })
      .catch(() => {
        if (live) setBalances({ usdt: null, usdc: null, offline: true });
      });
    return () => {
      live = false;
    };
  }, [wallet]);

  const address = wallet?.address;

  if (!address) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-teal-500/20 to-zinc-900 p-5 ring-1 ring-white/10">
        <p className="text-sm text-muted-foreground">Opening your wallet…</p>
      </div>
    );
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const usdt = balances?.usdt;
  const usdc = balances?.usdc;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-teal-400/25 via-zinc-900 to-zinc-950 p-5 shadow-lg ring-1 ring-white/10">
      <p className="text-[11px] font-medium tracking-[0.18em] text-teal-200/80 uppercase">
        Your wallet
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tracking-tight">
            {usdt == null ? "—" : Number(usdt).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="ml-1.5 text-base font-medium text-teal-200/80">USDT</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {usdc == null ? "—" : Number(usdc).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" className="h-8 cursor-pointer" onClick={() => void copy(address)}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {shortAddress(address)}
        </Button>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {balances?.offline
          ? "Couldn’t reach Ethereum — balances need a network. Signing still works offline."
          : Number(usdt) === 0 && Number(usdc) === 0
            ? "This new wallet is empty on-chain. You can still sign permissions and demo the QR flow."
            : "Balances on Ethereum mainnet."}
      </p>
    </div>
  );
}
