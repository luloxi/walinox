"use client";

import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { InboxList } from "@/components/inbox-list";
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
import { maybeDeliverMonthlyReport, monthlyReportOn, setMonthlyReportOn } from "@/lib/monthly-report";

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
  const { wallet, source, signMode, grantActive, chooseSignMode, lockLocal } = useWallet();
  const { disconnect } = useDisconnect();
  const [modeBusy, setModeBusy] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [alerts, setAlerts] = useState<"on" | "off" | "denied" | "unsupported">("off");
  const [monthly, setMonthly] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAlerts(notifyStatus());
      setMonthly(monthlyReportOn());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function toggleSign(session: boolean) {
    setModeBusy(true);
    setNote(null);
    try {
      const ok = await chooseSignMode(session ? "session" : "every");
      if (session && !ok) setNote("Tu wallet no permite enviar sin firmar.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "No se pudo cambiar el modo");
    } finally {
      setModeBusy(false);
    }
  }

  async function enableAlerts() {
    if (!wallet?.address) return;
    setNotifyBusy(true);
    setNote(null);
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
      await subscribePush(wallet.address);
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

  const fast = signMode === "session" && (grantActive || source === "local");
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
          {source === "local" ? "Local en este dispositivo" : "Conectada"}
        </p>
        <div className="[&_button]:cursor-pointer">
          <ConnectButton chainStatus="none" showBalance={false} accountStatus="full" label="Conectar billetera" />
        </div>
        <Button type="button" variant="destructive" className="h-11 w-full" onClick={disconnectWallet}>
          Desconectar
        </Button>
      </section>

      <section className="mt-6 space-y-2">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">Avisos</p>
        {alerts === "unsupported" ? (
          <p className="text-sm text-muted-foreground">Este navegador no permite avisos.</p>
        ) : alerts === "denied" ? (
          <p className="text-sm text-muted-foreground">Bloqueados en el navegador.</p>
        ) : alerts === "on" ? (
          <Button type="button" variant="outline" className="h-11 w-full" disabled={notifyBusy} onClick={() => void disableAlerts()}>
            Silenciar
          </Button>
        ) : (
          <Button type="button" className="h-11 w-full" disabled={notifyBusy || !wallet} onClick={() => void enableAlerts()}>
            {notifyBusy ? "Activando…" : "Activar avisos"}
          </Button>
        )}
        <div className="pt-2">
          <InboxList />
        </div>
      </section>

      <section className="mt-6 space-y-2">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">Reporte</p>
        {monthly ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => {
              setMonthlyReportOn(false);
              setMonthly(false);
            }}
          >
            Desactivar resumen mensual
          </Button>
        ) : (
          <Button
            type="button"
            className="h-11 w-full"
            disabled={!wallet}
            onClick={() => {
              setMonthlyReportOn(true);
              setMonthly(true);
              if (wallet?.address) maybeDeliverMonthlyReport(wallet.address);
            }}
          >
            Resumen mensual
          </Button>
        )}
      </section>

      <section className="mt-6 space-y-2">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">Firma</p>
        <Button
          type="button"
          variant={!fast ? "default" : "outline"}
          className="h-11 w-full"
          disabled={modeBusy}
          onClick={() => void toggleSign(false)}
        >
          Firmar cada envío
        </Button>
        <Button
          type="button"
          variant={fast ? "default" : "outline"}
          className="h-11 w-full"
          disabled={modeBusy}
          onClick={() => void toggleSign(true)}
        >
          {modeBusy ? "Pidiendo permiso…" : "Modo rápido · 24 h"}
        </Button>
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

      {note ? <p className="mt-4 text-xs text-primary">{note}</p> : null}
    </div>
  );
}
