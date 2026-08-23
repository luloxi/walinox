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
import { hasLegacyPlainSeed, hasVault, markSeedBackupAcked } from "@/lib/seed-crypto";
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
  const [mode, setMode] = useState<"unlock" | "create" | "backup-seed" | "suggest-bio">("unlock");
  const [seedWords, setSeedWords] = useState<string | null>(null);
  const [seedCopied, setSeedCopied] = useState(false);
  const [bioOk, setBioOk] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const titleId = useId();

  function startLocal() {
    const existing = hasVault() || hasLegacyPlainSeed();
    setMode(existing ? "unlock" : "create");
    setPin("");
    setConfirm("");
    setError(null);
    setSeedWords(null);
    setSeedCopied(false);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && mode !== "suggest-bio" && mode !== "backup-seed") setOpen(false);
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
        /* fall back to PIN */
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
      const result = await unlockLocal(pin);
      if (result.created) {
        setSeedWords(result.seed);
        setMode("backup-seed");
        return;
      }
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

  function finishBackup() {
    markSeedBackupAcked();
    setSeedWords(null);
    if (bioOk && !biometricEnabled()) {
      setMode("suggest-bio");
      return;
    }
    setOpen(false);
  }

  const dialog =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
            onClick={() => {
              if (mode !== "suggest-bio" && mode !== "backup-seed") setOpen(false);
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
              {mode === "backup-seed" ? (
                <>
                  <p id={titleId} className="text-base font-semibold">
                    Guardá tu frase de recuperación
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Anotala en papel y guardala en un lugar seguro. Es la única forma de recuperar esta billetera local
                    si perdés el dispositivo.
                  </p>
                  <p className="rounded-2xl border border-border bg-muted/40 p-3 font-mono text-sm leading-relaxed break-words">
                    {seedWords}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full"
                    onClick={() => {
                      if (!seedWords) return;
                      void navigator.clipboard.writeText(seedWords).then(() => {
                        setSeedCopied(true);
                        window.setTimeout(() => setSeedCopied(false), 1500);
                      });
                    }}
                  >
                    {seedCopied ? "Copiada" : "Copiar frase"}
                  </Button>
                  <Button type="button" className="h-11 w-full" onClick={finishBackup}>
                    Ya la guardé
                  </Button>
                </>
              ) : mode === "suggest-bio" ? (
                <>
                  <p id={titleId} className="text-base font-semibold">
                    ¿Desbloquear con biometría?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Huella o Face ID en este dispositivo. Podés cambiarlo después en Ajustes.
                  </p>
                  {error ? <p className="text-xs text-destructive">{error}</p> : null}
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setOpen(false)}>
                      Ahora no
                    </Button>
                    <Button
                      type="button"
                      className="h-11 flex-1"
                      disabled={busy}
                      onClick={() => void acceptBio()}
                    >
                      {busy ? "…" : "Activar"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p id={titleId} className="text-base font-semibold">
                    {mode === "create" ? "Crear billetera local" : "Desbloquear"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {mode === "create"
                      ? "Elegí un PIN de al menos 6 caracteres. La frase de recuperación se muestra después."
                      : "Ingresá el PIN de esta billetera local."}
                  </p>
                  <Input
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="PIN"
                    className="h-11"
                    autoFocus
                  />
                  {mode === "create" ? (
                    <Input
                      type="password"
                      inputMode="numeric"
                      value={confirm}
                      onChange={(event) => setConfirm(event.target.value)}
                      placeholder="Repetir PIN"
                      className="h-11"
                    />
                  ) : null}
                  {error ? <p className="text-xs text-destructive">{error}</p> : null}
                  <Button type="submit" className="h-11 w-full" disabled={busy || pin.length < 6}>
                    {busy ? "…" : mode === "create" ? "Crear" : "Entrar"}
                  </Button>
                  {mode === "unlock" && bioOk && bioOn ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full gap-2"
                      disabled={busy}
                      onClick={() => void tryBio()}
                    >
                      <Fingerprint className="size-4" />
                      Biometría
                    </Button>
                  ) : null}
                </>
              )}
            </form>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className={cn(stacked ? "flex w-full flex-col gap-2" : "flex flex-wrap gap-2", className)}>
        <Button type="button" className={cn("h-11", stacked && "w-full")} onClick={() => openConnectModal?.()}>
          {label}
        </Button>
        <Button type="button" variant="outline" className={cn("h-11", stacked && "w-full")} onClick={startLocal}>
          Billetera local
        </Button>
      </div>
      {dialog}
    </>
  );
}
