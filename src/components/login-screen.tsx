"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import { Landing } from "@/components/landing";
import { useWallet } from "@/components/wallet-provider";
import { TERMS_LINES } from "@/lib/session";

export function LoginScreen() {
  const { needsTos, signTos, hydrating } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return <Landing />;
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
