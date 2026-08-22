"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getContact, rememberContact } from "@/lib/contacts";
import { shortAddress } from "@/lib/format";

export function SaveContact({ address }: { address: string }) {
  const existing = getContact(address);
  const [name, setName] = useState(existing?.name ?? "");
  const [saved, setSaved] = useState(Boolean(existing?.name));

  return (
    <div className="rounded-2xl border border-white/10 p-3">
      <p className="text-xs text-muted-foreground">
        Recordar {shortAddress(address)} para el próximo envío y ver el historial.
      </p>
      <div className="mt-2 flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre del contacto"
          className="h-10 flex-1"
        />
        <Button
          type="button"
          className="h-10"
          onClick={() => {
            rememberContact(address, { name });
            setSaved(true);
          }}
        >
          {saved ? "Listo" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
