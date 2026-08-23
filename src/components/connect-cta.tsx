"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/components/wallet-provider";
import {
  biometricEnabled,
  enableBiometric,
  platformAuthenticatorAvailable,
  unlockWithBiometric,
} from "@/lib/biometric";
import { hasLegacyPlainSeed, hasVault } from "@/lib/seed-crypto";
import { cn } from "@/lib/utils";

export function ConnectCta({
  stacked,
  label = "Iniciar sesión",
  className,
}: {
  stacked?: boolean;
  label?: string;
  className?: string;
}) {
  const { openConnectModal } = useConnectModal();
  const { unlockLocal } = useWallet();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"unlock" | "create" | "suggest-bio">("unlock");
  const [bioOk, setBioOk] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const titleId = useId();

  function startLocal() {
    const existing = hasVault() || hasLegacyPlainSeed();
    setMode(existing ? "unlock" : "create");
    setPin("");
    setConfirm("");
    setError(null);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && mode !== "suggest-bio") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void platformAuthenticatorAvailable().then((ok) => {
      if (!cancelled) setBioOk(ok);
    });
    setBioOn(biometricEnabled());
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "unlock" || !biometricEnabled()) return;
    let cancelled = false;
    void (async () => {
      try {
        const recovered = await unlockWithBiometric();
        if (cancelled) return;
        setBusy(true);
        await unlockLocal(recovered);
        setOpen(false);
      } catch {
        /* user cancelled or failed — fall back to PIN */
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode, unlockLocal]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "create" && pin !== confirm) {
        setError("Los PIN no coinciden");
        return;
      }
      await unlockLocal(pin);
      if (mode === "create" && bioOk && !biometricEnabled()) {
        setMode("suggest-bio");
        return;
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir");
    } finally {
      setBusy(false);
    }
  }

  async function tryBio() {
    setBusy(true);
    setError(null);
    try {
      const recovered = await unlockWithBiometric();
      await unlockLocal(recovered);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Biometría falló");
    } finally {
      setBusy(false);
    }
  }

  async function acceptBio() {
    setBusy(true);
    setError(null);
    try {
      await enableBiometric(pin);
      setBioOn(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar");
    } finally {
      setBusy(false);
    }
  }

  const dialog =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
            onClick={() => {
              if (mode !== "suggest-bio") setOpen(false);
            }}
          >
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="w-full max-w-sm space-y-3 rounded-3xl bg-popover p-5 ring-1 ring-border sm:p-6"
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => void submit(event)}
            >
              {mode === "suggest-bio" ? (
                <>
                  <p id={titleId} className="text-base font-semibold">
                    ¿Desbloquear con biometría?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Huella o Face ID en este dispositivo. Podés cambiarlo después en Ajustes.
                  </p>
                  {error ? <p className="text-xs text-destructive">{error}</p> : null}
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 flex-1"
                      disabled={busy}
                      onClick={() => setOpen(false)}
                    >
                      Ahora no
                    </Button>
                    <Button type="button" className="h-11 flex-1" disabled={busy} onClick={() => void acceptBio()}>
                      {busy ? "…" : "Activar"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p id={titleId} className="text-base font-semibold">
                    {mode === "create" ? "Crear PIN de la billetera" : "PIN de la billetera"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {mode === "create"
                      ? "La seed se cifra en este dispositivo. Mínimo 6 caracteres."
                      : hasLegacyPlainSeed() && !hasVault()
                        ? "Vas a cifrar la seed que ya tenías con este PIN."
                        : "Desbloqueá la seed cifrada de este dispositivo."}
                  </p>
                  {mode === "unlock" && bioOn ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-11 w-full gap-2"
                      disabled={busy}
                      onClick={() => void tryBio()}
                    >
                      <Fingerprint className="size-4" />
                      {busy ? "…" : "Usar biometría"}
                    </Button>
                  ) : null}
                  <Input
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    enterKeyHint="done"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="PIN"
                    className="h-12 text-base"
                    autoFocus
                  />
                  {mode === "create" ? (
                    <Input
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      enterKeyHint="done"
                      value={confirm}
                      onChange={(event) => setConfirm(event.target.value)}
                      placeholder="Repetir PIN"
                      className="h-12 text-base"
                    />
                  ) : null}
                  {error ? <p className="text-xs text-destructive">{error}</p> : null}
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="h-12 flex-1" disabled={busy || pin.length < 6}>
                      {busy ? "…" : mode === "create" ? "Crear" : "Entrar"}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </div>,
          document.body,
        )
      : null;

  if (stacked) {
    return (
      <div className={cn("flex w-full flex-col items-stretch", className)}>
        <Button
          type="button"
          className="h-12 w-full"
          onClick={() => openConnectModal?.()}
          disabled={!openConnectModal}
        >
          {label}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="mt-2 h-11 w-full text-muted-foreground"
          onClick={startLocal}
        >
          Usar billetera local
        </Button>
        {dialog}
      </div>
    );
  }

  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)}>
      <Button
        type="button"
        className="h-10"
        onClick={() => openConnectModal?.()}
        disabled={!openConnectModal}
      >
        {label}
      </Button>
      <Button type="button" variant="ghost" className="h-10 px-2 text-muted-foreground" onClick={startLocal}>
        Local
      </Button>
      {dialog}
    </div>
  );
}
