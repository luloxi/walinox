"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getContact, rememberContact } from "@/lib/contacts";
import { shortAddress } from "@/lib/format";

export function SaveContact({
  address,
  hint,
  onSaved,
}: {
  address: string;
  hint?: string;
  onSaved?: () => void;
}) {
  const existing = getContact(address);
  const [name, setName] = useState(existing?.name ?? "");
  const [saved, setSaved] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden || saved || existing?.name.trim()) return null;

  return (
    <div className="rounded-2xl border border-border p-3">
      <p className="text-sm font-medium">¿Guardar este contacto?</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {shortAddress(address)}
        {hint ? ` · ${hint}` : " · así lo encontrás la próxima"}
      </p>
      <div className="mt-2 flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre"
          className="h-10 flex-1"
          aria-label="Nombre del contacto"
        />
        <Button
          type="button"
          className="h-10"
          disabled={!name.trim()}
          onClick={() => {
            rememberContact(address, { name: name.trim() });
            setSaved(true);
            onSaved?.();
          }}
        >
          Guardar
        </Button>
      </div>
      <button
        type="button"
        className="mt-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setHidden(true)}
      >
        Ahora no
      </button>
    </div>
  );
}
