"use client";

import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { useDisplay } from "@/components/display-provider";
import { useTheme } from "@/components/theme-provider";
import { useFx } from "@/components/use-fx";
import { useWallet } from "@/components/wallet-provider";
import { FIATS, fiatMeta, isFiatId } from "@/lib/display";
import { formatFiat } from "@/lib/fx";
import { shortAddress } from "@/lib/format";
import {
  BANNER_KEY,
  NOTIFY_OFF_KEY,
  requestNotifyPermission,
  subscribePush,
  unsubscribePush,
} from "@/lib/notify";

function notifyStatus(): "on" | "off" | "denied" | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  if (localStorage.getItem(NOTIFY_OFF_KEY) === "1") return "off";
  return "on";
}

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { prefs, setPrefs } = useDisplay();
  const fx = useFx();
  const { wallet, source, lockLocal } = useWallet();
  const { disconnect } = useDisconnect();
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [alerts, setAlerts] = useState<"on" | "off" | "denied" | "unsupported">("off");

  useEffect(() => {
    const timer = window.setTimeout(() => setAlerts(notifyStatus()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function enableAlerts() {
    if (!wallet?.address) return;
    setNotifyBusy(true);
    try {
      const permission = await requestNotifyPermission();
      if (permission === "denied") {
        setAlerts("denied");
        return;
      }
      if (permission !== "granted") {
        setAlerts("off");
        return;
      }
      localStorage.removeItem(NOTIFY_OFF_KEY);
      localStorage.setItem(BANNER_KEY, "1");
      await subscribePush(wallet.address, (typed) => wallet.signTypedData(typed));
      setAlerts("on");
    } finally {
      setNotifyBusy(false);
    }
  }

  async function disableAlerts() {
    setNotifyBusy(true);
    try {
      localStorage.setItem(NOTIFY_OFF_KEY, "1");
      await unsubscribePush();
      setAlerts("off");
    } finally {
      setNotifyBusy(false);
    }
  }

  function disconnectWallet() {
    if (source === "local") lockLocal();
    else {
      disconnect();
      lockLocal();
    }
  }

  const local = fiatMeta(prefs.fiat);

  return (
    <div className="mx-auto w-full max-w-lg pb-6">
      <section className="space-y-2">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">Moneda</p>
        <select
          className="h-11 w-full cursor-pointer rounded-lg border border-input bg-transparent px-3 text-sm"
          value={prefs.fiat}
          onChange={(event) => {
            const fiat = event.target.value;
            if (isFiatId(fiat)) setPrefs({ ...prefs, fiat });
          }}
          aria-label="Moneda local"
        >
          {FIATS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.country} · {item.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          {local.source} · {formatFiat(fx.perUsdt, prefs.fiat)} / USDT
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={prefs.primary === "fiat" ? "default" : "outline"}
            className="h-11"
            onClick={() => setPrefs({ ...prefs, primary: "fiat" })}
          >
            Primero {local.name}
          </Button>
          <Button
            type="button"
            variant={prefs.primary === "usdt" ? "default" : "outline"}
            className="h-11"
            onClick={() => setPrefs({ ...prefs, primary: "usdt" })}
          >
            Primero USDT
          </Button>
        </div>
      </section>

      <section className="mt-6 space-y-2">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">Wallet</p>
        <p className="font-mono text-sm">{wallet ? shortAddress(wallet.address) : "—"}</p>
        <p className="text-xs text-muted-foreground">
          {source === "local"
            ? "Billetera local · firmás cada operación"
            : "Wallet conectada · Walinox es intermediario, firmás en tu app"}
        </p>
        <div className="[&_button]:cursor-pointer">
          <ConnectButton chainStatus="none" showBalance={false} accountStatus="full" label="Conectar billetera" />
        </div>
        <Button type="button" variant="destructive" className="h-11 w-full" onClick={disconnectWallet}>
          Desconectar
        </Button>
      </section>

      <section className="mt-6 space-y-2">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Notificaciones push
        </p>
        <p className="text-xs text-muted-foreground">
          Solo el interruptor. La bandeja de avisos está en Avisos del menú.
        </p>
        {alerts === "unsupported" ? (
          <p className="text-sm text-muted-foreground">Este navegador no permite avisos.</p>
        ) : alerts === "denied" ? (
          <p className="text-sm text-muted-foreground">Bloqueados en el navegador.</p>
        ) : alerts === "on" ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            disabled={notifyBusy}
            onClick={() => void disableAlerts()}
          >
            Silenciar push
          </Button>
        ) : (
          <Button
            type="button"
            className="h-11 w-full"
            disabled={notifyBusy || !wallet}
            onClick={() => void enableAlerts()}
          >
            {notifyBusy ? "Activando…" : "Activar notificaciones push"}
          </Button>
        )}
      </section>

      <section className="mt-6 space-y-2">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">Apariencia</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={theme === "dark" ? "default" : "outline"}
            className="h-11"
            onClick={() => setTheme("dark")}
          >
            Oscuro
          </Button>
          <Button
            type="button"
            variant={theme === "light" ? "default" : "outline"}
            className="h-11"
            onClick={() => setTheme("light")}
          >
            Claro
          </Button>
        </div>
      </section>
    </div>
  );
}
