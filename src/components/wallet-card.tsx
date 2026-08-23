"use client";

import type { ReactNode } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useDisplay } from "@/components/display-provider";
import { useWallet } from "@/components/wallet-provider";
import { useUsdtBalance } from "@/components/use-usdt-balance";
import { Price } from "@/components/price";
import { FIATS, isFiatId } from "@/lib/display";

export function WalletCard({ children }: { children?: ReactNode }) {
  const { wallet } = useWallet();
  const { prefs, setPrefs } = useDisplay();
  const { usdt } = useUsdtBalance(wallet?.address);

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
      <div className="flex items-start gap-2">
        {usdt == null ? (
          <p className="text-3xl font-semibold">—</p>
        ) : (
          <Price usdt={usdt} size="lg" />
        )}
        <div className="mt-1 flex items-center gap-0.5">
          <select
            className="h-7 w-[3.55rem] cursor-pointer rounded-md border-0 bg-transparent px-1 text-xs text-muted-foreground hover:text-foreground"
            value={prefs.fiat}
            aria-label="Moneda del tipo de cambio"
            onChange={(event) => {
              const fiat = event.target.value;
              if (isFiatId(fiat)) setPrefs({ ...prefs, fiat });
            }}
          >
            {FIATS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
            <ArrowLeftRight className="size-3.5" />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
