"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "walinox.seenGuide";

export function Guide() {
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(true);

  useEffect(() => {
    setOpen(localStorage.getItem(KEY) !== "1");
  }, []);

  if (!open) return null;

  function close() {
    if (dontShow) localStorage.setItem(KEY, "1");
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-labelledby="guide-title"
        className="w-full max-w-sm rounded-3xl bg-zinc-950 p-6 ring-1 ring-white/15"
      >
        <p id="guide-title" className="text-lg font-semibold">
          Conectá una wallet para firmar
        </p>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li>Enviar / recibir USDT, online o por QR.</li>
          <li>Los ? explican cada flujo.</li>
        </ol>
        <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(event) => setDontShow(event.target.checked)}
            className="size-4 cursor-pointer accent-teal-400"
          />
          No volver a mostrar
        </label>
        <Button type="button" className="mt-4 h-11 w-full" onClick={close}>
          Entendido
        </Button>
      </div>
    </div>
  );
}
