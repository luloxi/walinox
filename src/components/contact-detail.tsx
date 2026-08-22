"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BackLink } from "@/components/back-link";
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
import { notifyPeer } from "@/lib/notify";
import type { Receipt } from "@/lib/receipts";

export function ContactDetail() {
  const params = useParams<{ address: string }>();
  const { wallet } = useWallet();
  const address = decodeURIComponent(params.address ?? "");
  const [contact, setContact] = useState<Contact | undefined>();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<Receipt[]>([]);
  const [ping, setPing] = useState("");
  const [pingNote, setPingNote] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);

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
    <div className="flex w-full flex-col pb-6">
      <BackLink href="/contacts" className="mb-3 -ml-1 hidden md:inline-flex">
        Contactos
      </BackLink>
      <div className="grid gap-8 lg:grid-cols-[minmax(16rem,24rem)_minmax(0,1fr)] lg:items-start">
        <div>
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
              <Link href={`/?to=${address}`}>Enviar</Link>
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

          {wallet ? (
            <form
              className="mt-4 space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                setPinging(true);
                setPingNote(null);
                void notifyPeer({
                  kind: "ping",
                  from: wallet.address,
                  to: address,
                  message: ping,
                  url: `/contacts/${wallet.address}`,
                }).then((result) => {
                  setPingNote(result.ok ? "Aviso enviado" : "No se pudo avisar. ¿Tiene la PWA abierta?");
                  if (result.ok) setPing("");
                  setPinging(false);
                });
              }}
            >
              <Input
                value={ping}
                onChange={(event) => setPing(event.target.value)}
                placeholder="Escribile algo…"
                className="h-10"
                maxLength={200}
              />
              <Button type="submit" variant="secondary" className="h-10 w-full" disabled={pinging}>
                {pinging ? "Enviando…" : "Avisar"}
              </Button>
              {pingNote ? <p className="text-xs text-muted-foreground">{pingNote}</p> : null}
            </form>
          ) : null}
          {!contact ? (
            <p className="mt-3 text-xs text-muted-foreground">No está en la agenda. Guardalo para recordarlo.</p>
          ) : null}
        </div>
        <section>
          <p className="text-sm font-medium">Historial</p>
          <div className="mt-2">
            <ActivityList receipts={history} empty="Todavía no hay movimientos con esta address." />
          </div>
        </section>
      </div>
    </div>
  );
}
