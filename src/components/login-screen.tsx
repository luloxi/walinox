"use client";

import { useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import { useWallet } from "@/components/wallet-provider";
import { TERMS_LINES } from "@/lib/session";

export function LoginScreen() {
  const { openConnectModal } = useConnectModal();
  const { needsTos, needsMode, unlockLocal, signTos, chooseSignMode, hydrating } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionNote, setSessionNote] = useState<string | null>(null);

  if (hydrating) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await signTos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo firmar");
    } finally {
      setBusy(false);
    }
  }

  async function pickMode(session: boolean) {
    setBusy(true);
    setError(null);
    setSessionNote(null);
    try {
      if (!session) {
        await chooseSignMode("every");
        return;
      }
      const ok = await chooseSignMode("session");
      if (!ok) setSessionNote("Tu wallet no permite enviar sin firmar. Vas a firmar cada envío.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar el modo");
    } finally {
      setBusy(false);
    }
  }

  if (needsTos) {
    return (
      <Shell>
        <p className="text-xl font-semibold">Antes de entrar</p>
        <p className="mt-2 text-sm text-muted-foreground">Una firma. No se vuelve a pedir en esta address.</p>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
          {TERMS_LINES.map((line) => (
            <li key={line.slice(0, 28)}>{line}</li>
          ))}
        </ul>
        {error ? <p className="mt-4 text-xs text-red-400">{error}</p> : null}
        <Button type="button" className="mt-6 h-12 w-full" disabled={busy} onClick={() => void accept()}>
          {busy ? "Firmando…" : "Aceptar y firmar"}
        </Button>
      </Shell>
    );
  }

  if (needsMode) {
    return (
      <Shell>
        <p className="text-xl font-semibold">Cómo firmás los envíos</p>
        <p className="mt-2 text-sm text-muted-foreground">
          El modo rápido es opcional. Si tu wallet no lo soporta, vas a firmar cada transacción.
        </p>
        {sessionNote ? <p className="mt-4 text-xs text-primary">{sessionNote}</p> : null}
        {error ? <p className="mt-4 text-xs text-red-400">{error}</p> : null}
        <Button type="button" className="mt-6 h-12 w-full" disabled={busy} onClick={() => void pickMode(false)}>
          Firmar cada envío
        </Button>
        <Button
          type="button"
          variant="outline"
          className="mt-2 h-12 w-full"
          disabled={busy}
          onClick={() => void pickMode(true)}
        >
          {busy ? "Pidiendo permiso…" : "Modo rápido · esta sesión"}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          El modo rápido pide una firma ahora. Si la wallet acepta, los envíos de USDT de las próximas 24 h no vuelven a abrir el popup.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-xl font-semibold">Billetera USDT</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Enviá y recibí USDT en Ethereum, online o por QR. Vales para el kiosco. Las claves las tenés vos.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">Sin wallet conectada no hay saldo.</p>
      <Button
        type="button"
        className="mt-6 h-12 w-full"
        onClick={() => openConnectModal?.()}
        disabled={!openConnectModal}
      >
        Conectar billetera
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="mt-2 h-11 w-full text-muted-foreground"
        onClick={() => void unlockLocal()}
      >
        Usar billetera local
      </Button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Brand className="justify-center" />
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
