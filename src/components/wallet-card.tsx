"use client";

import type { ReactNode } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useDisplay } from "@/components/display-provider";
import { useWallet } from "@/components/wallet-provider";
import { useUsdtBalance } from "@/components/use-usdt-balance";
import { Price } from "@/components/price";
import { FIATS, fiatMeta, isFiatId } from "@/lib/display";

export function WalletCard({ children }: { children?: ReactNode }) {
  const { wallet } = useWallet();
  const { prefs, setPrefs } = useDisplay();
  const { usdt } = useUsdtBalance(wallet?.address);
  const current = fiatMeta(prefs.fiat);

  const address = wallet?.address;
  if (!address) {
    return (
      <div className="flex min-h-24 items-center rounded-2xl bg-card p-4 ring-1 ring-border">
        <p className="text-sm text-muted-foreground">Conectá una wallet para ver el saldo.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl bg-gradient-to-br from-primary/15 to-card p-4 ring-1 ring-border md:p-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          onClick={() =>
            setPrefs({ ...prefs, primary: prefs.primary === "fiat" ? "usdt" : "fiat" })
          }
          aria-label={
            prefs.primary === "fiat"
              ? "Mostrar saldo en USDT"
              : `Mostrar saldo en ${prefs.fiat}`
          }
          title={prefs.primary === "fiat" ? "Ver en USDT" : `Ver en ${prefs.fiat}`}
        >
          <ArrowLeftRight className="size-5" strokeWidth={2.25} />
        </button>

        <div className="min-w-0 flex-1">
          {usdt == null ? (
            <p className="text-3xl font-semibold">—</p>
          ) : (
            <Price usdt={usdt} size="lg" />
          )}
        </div>

        <label className="relative inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-muted active:scale-95">
          <span className="text-xl leading-none" aria-hidden>
            {current.flag}
          </span>
          <span className="sr-only">Moneda local: {current.name}</span>
          <select
            className="absolute inset-0 cursor-pointer opacity-0"
            value={prefs.fiat}
            aria-label="Elegir moneda local"
            onChange={(event) => {
              const fiat = event.target.value;
              if (isFiatId(fiat)) setPrefs({ ...prefs, fiat });
            }}
          >
            {FIATS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.flag} {item.country} · {item.id}
              </option>
            ))}
          </select>
        </label>
      </div>
      {children}
    </div>
  );
}
