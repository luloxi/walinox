"use client";

import { useState } from "react";

import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decryptSeed, markSeedBackupAcked, seedBackupAcked } from "@/lib/seed-crypto";

export function SeedBackupSettings() {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [phrase, setPhrase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acked, setAcked] = useState(() => seedBackupAcked());

  async function reveal() {
    setBusy(true);
    setError(null);
    try {
      const seed = await decryptSeed(pin);
      setPhrase(seed);
      markSeedBackupAcked();
      setAcked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir");
      setPhrase(null);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setPin("");
    setPhrase(null);
    setError(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm">Frase de recuperación</p>
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setOpen((v) => !v)}>
          {open ? "Cerrar" : acked ? "Ver" : "Respaldar"}
        </Button>
      </div>
      {!acked ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">Anotá las 12 palabras en un lugar seguro.</p>
      ) : null}
      {open ? (
        <div className="space-y-2 rounded-2xl border border-border p-3">
          {!phrase ? (
            <>
              <Input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="PIN"
                className="h-11"
              />
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <Button
                type="button"
                className="h-11 w-full gap-2"
                disabled={busy || pin.length < 6}
                onClick={() => void reveal()}
              >
                <KeyRound className="size-4" />
                {busy ? "…" : "Mostrar frase"}
              </Button>
            </>
          ) : (
            <>
              <p className="rounded-xl bg-muted/40 p-3 font-mono text-sm leading-relaxed break-words">{phrase}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    void navigator.clipboard.writeText(phrase).then(() => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1500);
                    });
                  }}
                >
                  {copied ? "Copiada" : "Copiar"}
                </Button>
                <Button type="button" className="h-11" onClick={close}>
                  Listo
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
