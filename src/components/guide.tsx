"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "walinox.seenGuide";

export function Guide() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(localStorage.getItem(KEY) !== "1");
  }, []);

  if (!open) return null;

  return (
    <div className="rounded-3xl border border-teal-400/20 bg-teal-400/5 p-5">
      <p className="text-sm font-medium">Tu plata, dos formas de moverla</p>
      <ol className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">Recibir:</span> copiá tu address (como un
          CBU) o mostrá el QR.
        </li>
        <li>
          <span className="font-medium text-foreground">Enviar online:</span> address + monto +
          Enviar (hace falta ETH para gas).
        </li>
        <li>
          <span className="font-medium text-foreground">Enviar sin internet:</span> firmás acá y le
          mostrás el QR al otro. Ellos lo mandan a la red después.
        </li>
      </ol>
      <Button
        type="button"
        className="mt-4 h-10 w-full cursor-pointer"
        onClick={() => {
          localStorage.setItem(KEY, "1");
          setOpen(false);
        }}
      >
        Entendido
      </Button>
    </div>
  );
}
