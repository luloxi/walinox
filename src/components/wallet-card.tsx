"use client";

import { ArrowLeftRight, ChevronDown } from "lucide-react";
import { useDisplay } from "@/components/display-provider";
import { useWallet } from "@/components/wallet-provider";
import { useUsdtBalance } from "@/components/use-usdt-balance";
import { UsdtLogo } from "@/components/usdt-logo";
import { BalanceSpark } from "@/components/balance-spark";
import { useFx } from "@/components/use-fx";
import { FIATS, fiatMeta, isFiatId, type FiatId } from "@/lib/display";
import { formatFiat, formatUsdt, usdtToFiat } from "@/lib/fx";

export function WalletCard() {
  const { wallet } = useWallet();
  const { prefs, setPrefs } = useDisplay();
  const { usdt, offline } = useUsdtBalance(wallet?.address);
  const fx = useFx();
  const current = fiatMeta(prefs.fiat);
  const fiatFirst = prefs.primary === "fiat";

  const address = wallet?.address;
  if (!address) {
    return (
      <div className="flex min-h-24 items-center rounded-2xl bg-card p-4 ring-1 ring-border">
        <p className="text-sm text-muted-foreground">Conectá una wallet para ver el saldo.</p>
      </div>
    );
  }

  const n = usdt == null ? null : Number(usdt);
  const fiatValue =
    n == null || !Number.isFinite(n) ? null : usdtToFiat(n, fx.perUsdt);
  const usdtLabel = n == null ? "—" : formatUsdt(n);
  const fiatLabel = fiatValue == null ? "—" : formatFiat(fiatValue, prefs.fiat);

  return (
    <div className="flex flex-col rounded-2xl bg-gradient-to-br from-primary/15 to-card p-4 ring-1 ring-border md:p-5">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-8">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5 md:max-w-[52%]">
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

        <div className="min-w-0 flex-1 space-y-0.5">
          {fiatFirst ? (
            <>
              <div className="flex items-center gap-2">
                <FlagPicker
                  flag={current.flag}
                  name={current.name}
                  value={prefs.fiat}
                  onChange={(fiat) => setPrefs({ ...prefs, fiat })}
                />
                <p className="truncate text-3xl font-semibold tabular-nums leading-none">{fiatLabel}</p>
              </div>
              <div className="flex items-center gap-1.5 pl-0.5 text-sm text-muted-foreground">
                <UsdtLogo className="size-3.5 shrink-0" />
                <span className="tabular-nums">{usdtLabel}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <UsdtLogo className="size-7 shrink-0" />
                <p className="truncate text-3xl font-semibold tabular-nums leading-none">{usdtLabel}</p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <FlagPicker
                  flag={current.flag}
                  name={current.name}
                  value={prefs.fiat}
                  onChange={(fiat) => setPrefs({ ...prefs, fiat })}
                  compact
                />
                <span className="tabular-nums">{fiatLabel}</span>
              </div>
            </>
          )}
        </div>
      </div>
        {n != null ? <BalanceSpark address={address} nowUsdt={n} /> : null}
      </div>
      {offline ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Sin conexión · saldo guardado en este dispositivo
        </p>
      ) : null}
    </div>
  );
}

function FlagPicker({
  flag,
  name,
  value,
  onChange,
  compact = false,
}: {
  flag: string;
  name: string;
  value: string;
  onChange: (fiat: FiatId) => void;
  compact?: boolean;
}) {
  return (
    <label
      className={
        compact
          ? "relative inline-flex h-7 shrink-0 cursor-pointer items-center gap-0.5 rounded-full bg-muted/80 px-1.5 ring-1 ring-border transition-colors hover:bg-muted active:scale-95"
          : "relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-0.5 rounded-full bg-muted/80 px-2 ring-1 ring-border transition-colors hover:bg-muted active:scale-95"
      }
      title={`Cambiar moneda local (${name})`}
    >
      <span className={compact ? "text-base leading-none" : "text-xl leading-none"} aria-hidden>
        {flag}
      </span>
      <ChevronDown
        className={compact ? "size-3 text-muted-foreground" : "size-3.5 text-muted-foreground"}
        strokeWidth={2.5}
        aria-hidden
      />
      <span className="sr-only">Elegir moneda local: {name}</span>
      <select
        className="absolute inset-0 cursor-pointer opacity-0"
        value={value}
        aria-label="Elegir moneda local"
        onChange={(event) => {
          const fiat = event.target.value;
          if (isFiatId(fiat)) onChange(fiat);
        }}
      >
        {FIATS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.flag} {item.country} · {item.id}
          </option>
        ))}
      </select>
    </label>
  );
}
