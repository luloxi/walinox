"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Check, Copy } from "lucide-react";
import { shortAddress } from "@/lib/format";
import { useWallet } from "@/components/wallet-provider";
import { useUsdtBalance } from "@/components/use-usdt-balance";
import { UsdtLogo } from "@/components/usdt-logo";

export function WalletCard({ actions = false }: { actions?: boolean }) {
  const { wallet } = useWallet();
  const [copied, setCopied] = useState(false);
  const { usdt, offline } = useUsdtBalance(wallet?.address);

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

  return (
    <div className="flex h-full flex-col justify-between rounded-3xl bg-gradient-to-br from-teal-400/25 via-zinc-900 to-zinc-950 p-5 shadow-lg ring-1 ring-white/10 md:p-8">
      <div>
        <p className="text-[11px] font-medium tracking-[0.18em] text-teal-200/80 uppercase">
          Saldo disponible
        </p>
        <p className="mt-3 flex items-center gap-3 text-4xl font-semibold tracking-tight md:text-5xl">
          {usdt == null ? "—" : Number(usdt).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          <UsdtLogo className="size-8 shrink-0 md:size-10" />
          <span className="sr-only">USDT</span>
        </p>
        {offline ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Sin red: no se puede ver el saldo. Igual podés firmar offline.
          </p>
        ) : null}
        <button
          type="button"
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-muted-foreground hover:bg-white/10"
          onClick={() => void copy(address)}
          aria-label={copied ? "Address copiada" : "Copiar address"}
        >
          <span className="font-mono text-sm">{shortAddress(address)}</span>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      {actions ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
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
  );
}
