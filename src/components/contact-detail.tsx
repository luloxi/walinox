"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActivityList } from "@/components/activity-list";
import { useWallet } from "@/components/wallet-provider";
import {
  getContact,
  receiptsWith,
  rememberContact,
  removeContact,
  type Contact,
} from "@/lib/contacts";
import { shortAddress } from "@/lib/format";
import type { Receipt } from "@/lib/receipts";

export function ContactDetail() {
  const params = useParams<{ address: string }>();
  const { wallet } = useWallet();
  const address = decodeURIComponent(params.address ?? "");
  const [contact, setContact] = useState<Contact | undefined>();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<Receipt[]>([]);

  useEffect(() => {
    try {
      const found = getContact(address);
      setContact(found);
      setName(found?.name ?? "");
      setNote(found?.note ?? "");
      setHistory(receiptsWith(address, wallet?.address));
    } catch {
      setContact(undefined);
      setHistory([]);
    }
  }, [address, wallet?.address]);

  if (!address) return <p className="text-sm text-muted-foreground">Contacto inválido.</p>;

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto">
      <h2 className="text-lg font-semibold">{name.trim() || shortAddress(address)}</h2>
      <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{address}</p>

      <div className="mt-4 space-y-2">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre" className="h-10" />
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nota (CUIT, local, teléfono…)"
          rows={2}
        />
        <Button
          type="button"
          className="h-10 w-full"
          onClick={() => setContact(rememberContact(address, { name, note }))}
        >
          Guardar
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button asChild className="h-11">
          <Link href={`/send?to=${address}`}>Enviar</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => {
            removeContact(address);
            setContact(undefined);
          }}
        >
          Olvidar
        </Button>
      </div>

      <h3 className="mt-6 text-sm font-medium">Historial con este contacto</h3>
      <div className="mt-2 pb-4">
        <ActivityList receipts={history} empty="Todavía no hay movimientos con esta address." />
      </div>
      {!contact ? (
        <p className="pb-4 text-xs text-muted-foreground">No está en la agenda. Guardalo para recordarlo.</p>
      ) : null}
    </div>
  );
}
