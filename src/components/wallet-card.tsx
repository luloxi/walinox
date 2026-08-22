"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/format";
import { useWallet } from "@/components/wallet-provider";

type Balances = { usdt: string | null; usdc: string | null; offline?: boolean };

export function WalletCard({ actions = false }: { actions?: boolean }) {
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
      <div className="flex h-full min-h-48 items-center rounded-3xl bg-gradient-to-br from-teal-500/20 to-zinc-900 p-5 ring-1 ring-white/10">
        <p className="text-sm text-muted-foreground">Abriendo tu billetera…</p>
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
    <div className="flex h-full flex-col justify-between rounded-3xl bg-gradient-to-br from-teal-400/25 via-zinc-900 to-zinc-950 p-5 shadow-lg ring-1 ring-white/10 md:p-8">
      <div>
        <p className="text-[11px] font-medium tracking-[0.18em] text-teal-200/80 uppercase">
          Saldo disponible
        </p>
        <p className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          {usdt == null ? "—" : Number(usdt).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          <span className="ml-2 text-lg font-medium text-teal-200/80">USDT</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {usdc == null ? "—" : Number(usdc).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
        </p>
        {balances?.offline ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Sin red: no se puede ver el saldo. Igual podés firmar offline.
          </p>
        ) : null}
      </div>
      <div className="mt-6 space-y-3">
        <Button
          type="button"
          variant="secondary"
          className="h-11 w-full"
          onClick={() => void copy(address)}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Address copiada" : `Copiar address · ${shortAddress(address)}`}
        </Button>
        {actions ? (
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/send"
              className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-teal-400 text-sm font-semibold text-zinc-950"
            >
              <ArrowUpRight className="size-5" />
              Enviar
            </Link>
            <Link
              href="/receive"
              className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white/10 text-sm font-semibold ring-1 ring-white/10"
            >
              <ArrowDownLeft className="size-5" />
              Recibir
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
