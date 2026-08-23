"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useDisconnect } from "wagmi";
import {
  Bell,
  Check,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Fingerprint,
  KeyRound,
  Moon,
  Sun,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UsdtLogo } from "@/components/usdt-logo";
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
import { changePin } from "@/lib/seed-crypto";
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

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Wallet;
  children: ReactNode;
}) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
      <Icon className="size-4.5" strokeWidth={2.25} aria-hidden />
      {children}
    </p>
  );
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
  const [pinOpen, setPinOpen] = useState(false);
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinNext, setPinNext] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinOk, setPinOk] = useState(false);

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

  async function submitChangePin() {
    setPinBusy(true);
    setPinError(null);
    setPinOk(false);
    try {
      if (pinNext !== pinConfirm) throw new Error("Los PIN nuevos no coinciden");
      await changePin(pinCurrent, pinNext);
      if (biometricEnabled()) {
        try {
          await enableBiometric(pinNext);
        } catch {
          disableBiometric();
          setBioOn(false);
        }
      }
      setPinCurrent("");
      setPinNext("");
      setPinConfirm("");
      setPinOpen(false);
      setPinOk(true);
      window.setTimeout(() => setPinOk(false), 2500);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "No se pudo cambiar el PIN");
    } finally {
      setPinBusy(false);
    }
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
        <SectionTitle icon={CircleDollarSign}>Moneda</SectionTitle>
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
              {item.flag} {item.country}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          <span className="text-base leading-none">{local.flag}</span>{" "}
          {formatFiat(fx.perUsdt, prefs.fiat)} / USDT
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={prefs.primary === "fiat" ? "default" : "outline"}
            className="h-11 gap-2"
            onClick={() => setPrefs({ ...prefs, primary: "fiat" })}
          >
            <span className="text-lg leading-none" aria-hidden>
              {local.flag}
            </span>
            {local.id}
          </Button>
          <Button
            type="button"
            variant={prefs.primary === "usdt" ? "default" : "outline"}
            className="h-11 gap-2"
            onClick={() => setPrefs({ ...prefs, primary: "usdt" })}
          >
            <UsdtLogo className="size-5 shrink-0" />
            USDT
          </Button>
        </div>
      </section>

      <section className="mt-6 space-y-2">
        <SectionTitle icon={Wallet}>Wallet</SectionTitle>
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
                {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
              </button>
            </div>
            {etherscanUrl ? (
              <Button type="button" variant="outline" className="h-11 w-full gap-2" asChild>
                <a href={etherscanUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-5" />
                  Etherscan
                </a>
              </Button>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Sin wallet</p>
        )}
        <Button type="button" variant="destructive" className="h-11 w-full" onClick={disconnectWallet}>
          Desconectar
        </Button>
      </section>

      {source === "local" ? (
        <section className="mt-6 space-y-2">
          <SectionTitle icon={KeyRound}>Seguridad</SectionTitle>

          {pinOk ? <p className="text-sm text-primary">PIN actualizado</p> : null}

          {pinOpen ? (
            <div className="space-y-2 rounded-2xl border border-border p-3">
              <Input
                type="password"
                inputMode="numeric"
                value={pinCurrent}
                onChange={(event) => setPinCurrent(event.target.value)}
                placeholder="PIN actual"
                className="h-11"
                autoFocus
              />
              <Input
                type="password"
                inputMode="numeric"
                value={pinNext}
                onChange={(event) => setPinNext(event.target.value)}
                placeholder="PIN nuevo"
                className="h-11"
              />
              <Input
                type="password"
                inputMode="numeric"
                value={pinConfirm}
                onChange={(event) => setPinConfirm(event.target.value)}
                placeholder="Repetir PIN"
                className="h-11"
              />
              {pinError ? <p className="text-xs text-destructive">{pinError}</p> : null}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    setPinOpen(false);
                    setPinError(null);
                    setPinCurrent("");
                    setPinNext("");
                    setPinConfirm("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="h-11"
                  disabled={pinBusy || pinCurrent.length < 6 || pinNext.length < 6}
                  onClick={() => void submitChangePin()}
                >
                  {pinBusy ? "…" : "Guardar"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full gap-2"
              onClick={() => setPinOpen(true)}
            >
              <KeyRound className="size-5" />
              Cambiar PIN
            </Button>
          )}

          {!bioAvailable ? null : bioOn ? (
            <Button type="button" variant="outline" className="h-11 w-full gap-2" onClick={turnOffBio}>
              <Fingerprint className="size-5" />
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
            <Button type="button" className="h-11 w-full gap-2" onClick={() => setBioAskPin(true)}>
              <Fingerprint className="size-5" />
              Activar biometría
            </Button>
          )}
        </section>
      ) : null}

      <section className="mt-6 space-y-2">
        <SectionTitle icon={Bell}>Avisos</SectionTitle>
        {alerts === "unsupported" || alerts === "denied" ? (
          <p className="text-sm text-muted-foreground">
            {alerts === "denied" ? "Bloqueados en el navegador" : "No disponibles"}
          </p>
        ) : alerts === "on" ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-2"
            disabled={notifyBusy}
            onClick={() => void disableAlerts()}
          >
            <Bell className="size-5" />
            Silenciar
          </Button>
        ) : (
          <Button
            type="button"
            className="h-11 w-full gap-2"
            disabled={notifyBusy || !wallet}
            onClick={() => void enableAlerts()}
          >
            <Bell className="size-5" />
            {notifyBusy ? "…" : "Activar push"}
          </Button>
        )}
      </section>

      <section className="mt-6 space-y-2">
        <SectionTitle icon={theme === "dark" ? Moon : Sun}>Apariencia</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={theme === "dark" ? "default" : "outline"}
            className="h-11 gap-2"
            onClick={() => setTheme("dark")}
          >
            <Moon className="size-5" />
            Oscuro
          </Button>
          <Button
            type="button"
            variant={theme === "light" ? "default" : "outline"}
            className="h-11 gap-2"
            onClick={() => setTheme("light")}
          >
            <Sun className="size-5" />
            Claro
          </Button>
        </div>
      </section>
    </div>
  );
}
