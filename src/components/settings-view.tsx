"use client";

import { useEffect, useState } from "react";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/hint";
import { useTheme } from "@/components/theme-provider";
import { useWallet } from "@/components/wallet-provider";
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
  const { wallet, source, signMode, grantActive, chooseSignMode, lockLocal } = useWallet();
  const { disconnect } = useDisconnect();
  const [modeBusy, setModeBusy] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [alerts, setAlerts] = useState<"on" | "off" | "denied" | "unsupported">("off");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setAlerts(notifyStatus()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function toggleSign(session: boolean) {
    setModeBusy(true);
    setNote(null);
    try {
      const ok = await chooseSignMode(session ? "session" : "every");
      if (session && !ok) setNote("Tu wallet no permite enviar sin firmar. Vas a firmar cada envío.");
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

  return (
    <div className="mx-auto w-full max-w-lg pb-6">
      <div className="flex items-center justify-end">
        <Hint text="Tema, firma, avisos y la wallet. Nada de esto mueve fondos por sí solo." />
      </div>

      <section className="mt-4 space-y-2">
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
          {modeBusy ? "Pidiendo permiso…" : "Modo rápido · esta sesión"}
        </Button>
        <p className="text-xs text-muted-foreground">
          El modo rápido pide una firma ahora. Si la wallet acepta, los envíos de las próximas 24 h no vuelven a abrir el popup.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">Notificaciones</p>
        {alerts === "unsupported" ? (
          <p className="text-sm text-muted-foreground">Este navegador no permite avisos.</p>
        ) : alerts === "denied" ? (
          <p className="text-sm text-muted-foreground">Los avisos están bloqueados. Activalos en el navegador.</p>
        ) : alerts === "on" ? (
          <>
            <p className="text-sm">Avisos activos.</p>
            <Button type="button" variant="outline" className="h-11 w-full" disabled={notifyBusy} onClick={() => void disableAlerts()}>
              Silenciar avisos
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Enterate cuando te mandan USDT o un vale.</p>
            <Button type="button" className="h-11 w-full" disabled={notifyBusy || !wallet} onClick={() => void enableAlerts()}>
              {notifyBusy ? "Activando…" : "Activar avisos"}
            </Button>
          </>
        )}
      </section>

      <section className="mt-6 space-y-2">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">Wallet</p>
        <p className="font-mono text-sm">{wallet ? shortAddress(wallet.address) : "—"}</p>
        <p className="text-xs text-muted-foreground">
          {source === "local" ? "Billetera local de esta app." : "Wallet conectada."}
        </p>
        <Button type="button" variant="destructive" className="h-11 w-full" onClick={disconnectWallet}>
          Desconectar
        </Button>
      </section>

      {note ? <p className="mt-4 text-xs text-primary">{note}</p> : null}
    </div>
  );
}
