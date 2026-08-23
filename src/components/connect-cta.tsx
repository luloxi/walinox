"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/components/wallet-provider";
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
  const [mode, setMode] = useState<"unlock" | "create">("unlock");
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
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir");
    } finally {
      setBusy(false);
    }
  }

  const dialog =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setOpen(false)}
          >
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="w-full max-w-sm space-y-3 rounded-3xl bg-popover p-6 ring-1 ring-border"
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => void submit(event)}
            >
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
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
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
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Repetir PIN"
                  className="h-11"
                />
              ) : null}
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="h-11 flex-1" disabled={busy || pin.length < 6}>
                  {busy ? "…" : mode === "create" ? "Crear" : "Entrar"}
                </Button>
              </div>
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
