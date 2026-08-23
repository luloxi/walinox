"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDisplay } from "@/components/display-provider";
import { useTheme } from "@/components/theme-provider";
import { useWallet } from "@/components/wallet-provider";
import { shortAddress } from "@/lib/format";
import { moonpayPublicKey, openOnramp } from "@/lib/onramp";

export function OnrampPanel() {
  const { wallet } = useWallet();
  const { prefs } = useDisplay();
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const configured = Boolean(moonpayPublicKey());

  async function go() {
    if (!wallet) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await openOnramp({
        walletAddress: wallet.address,
        fiat: prefs.fiat,
        theme: theme === "light" ? "light" : "dark",
      });
      if (!result.ok) setNote(result.reason);
      else setNote("Se abrió MoonPay. Completá la compra ahí; el USDT llega a tu address.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "No se pudo abrir el onramp");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium">Ingresar fondos</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Comprá USDT con fiat (tarjeta, transferencia u otros métodos según tu país) vía MoonPay, el módulo fiat
          preferido del WDK de Tether.
        </p>
        {wallet ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">Destino · {shortAddress(wallet.address)}</p>
        ) : null}
      </div>

      {!configured ? (
        <p className="text-sm text-muted-foreground">
          Para activarlo hace falta la publishable key de MoonPay (`NEXT_PUBLIC_MOONPAY_API_KEY`). Opcional en servidor:
          `MOONPAY_SECRET_KEY` para firmar la URL y fijar tu address.
        </p>
      ) : null}

      <Button type="button" className="h-12 w-full" disabled={!wallet || busy || !configured} onClick={() => void go()}>
        {busy ? "Abriendo…" : configured ? "Comprar USDT" : "Onramp no configurado"}
      </Button>

      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
