"use client";

import { useEffect, useState } from "react";
import { useDisconnect } from "wagmi";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDisplay } from "@/components/display-provider";
import { useTheme } from "@/components/theme-provider";
import { useFx } from "@/components/use-fx";
import { useWallet } from "@/components/wallet-provider";
import {
  biometricEnabled,
  disableBiometric,
  enableBiometric,
  platformAuthenticatorAvailable,
} from "@/lib/biometric";
import { FIATS, fiatMeta, isFiatId } from "@/lib/display";
import { formatFiat } from "@/lib/fx";
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
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [bioPin, setBioPin] = useState("");
  const [bioAskPin, setBioAskPin] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAlerts(notifyStatus());
      setBioOn(biometricEnabled());
      void platformAuthenticatorAvailable().then(setBioAvailable);
    }, 0);
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

  async function confirmBio() {
    setBioBusy(true);
    setBioError(null);
    try {
      await enableBiometric(bioPin);
      setBioOn(true);
      setBioAskPin(false);
      setBioPin("");
    } catch (err) {
      setBioError(err instanceof Error ? err.message : "No se pudo activar");
    } finally {
      setBioBusy(false);
    }
  }

  function turnOffBio() {
    disableBiometric();
    setBioOn(false);
    setBioAskPin(false);
    setBioPin("");
    setBioError(null);
  }

  function disconnectWallet() {
    if (source === "local") lockLocal();
    else {
      disconnect();
      lockLocal();
    }
  }

  async function copyAddress() {
    if (!wallet?.address) return;
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  const local = fiatMeta(prefs.fiat);
  const etherscanUrl = wallet?.address
    ? `https://etherscan.io/address/${wallet.address}`
    : null;

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
        {wallet?.address ? (
          <>
            <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 ring-1 ring-border">
              <p className="min-w-0 flex-1 break-all font-mono text-sm leading-relaxed">{wallet.address}</p>
              <button
                type="button"
                className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
                onClick={() => void copyAddress()}
                aria-label={copied ? "Copiado" : "Copiar address"}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {source === "local"
                ? "Billetera local · firmás cada operación"
                : "Wallet conectada · Walinox es intermediario, firmás en tu app"}
            </p>
            {etherscanUrl ? (
              <Button type="button" variant="outline" className="h-11 w-full gap-2" asChild>
                <a href={etherscanUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                  Ver en Etherscan
                </a>
              </Button>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Sin wallet conectada.</p>
        )}
        <Button type="button" variant="destructive" className="h-11 w-full" onClick={disconnectWallet}>
          Desconectar
        </Button>
      </section>

      {source === "local" ? (
        <section className="mt-6 space-y-2">
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Biometría
          </p>
          <p className="text-xs text-muted-foreground">
            Desbloqueo con huella o Face ID en este dispositivo. El PIN sigue siendo la llave de la seed.
          </p>
          {!bioAvailable ? (
            <p className="text-sm text-muted-foreground">Este dispositivo no ofrece biometría en el navegador.</p>
          ) : bioOn ? (
            <Button type="button" variant="outline" className="h-11 w-full" onClick={turnOffBio}>
              Desactivar biometría
            </Button>
          ) : bioAskPin ? (
            <div className="space-y-2">
              <Input
                type="password"
                inputMode="numeric"
                value={bioPin}
                onChange={(event) => setBioPin(event.target.value)}
                placeholder="PIN actual"
                className="h-11"
                autoFocus
              />
              {bioError ? <p className="text-xs text-destructive">{bioError}</p> : null}
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="h-11" onClick={() => setBioAskPin(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="h-11"
                  disabled={bioBusy || bioPin.length < 6}
                  onClick={() => void confirmBio()}
                >
                  {bioBusy ? "…" : "Activar"}
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" className="h-11 w-full" onClick={() => setBioAskPin(true)}>
              Activar biometría
            </Button>
          )}
        </section>
      ) : null}

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
