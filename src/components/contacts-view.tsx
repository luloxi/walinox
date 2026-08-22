"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isAddress } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  contactLabel,
  listContacts,
  rememberContact,
  type Contact,
} from "@/lib/contacts";
import { parsePaymentAddress } from "@/lib/payment-address";
import { shortAddress } from "@/lib/format";

export function ContactsView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setContacts(listContacts());
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto">
      <h2 className="text-lg font-semibold">Contactos</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Para particulares y comercios: cada address con nombre e historial.
      </p>

      <form
        className="mt-4 space-y-2 rounded-2xl border border-white/10 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = parsePaymentAddress(address) ?? (isAddress(address) ? address : null);
          if (!parsed) {
            setError("Address inválida");
            return;
          }
          rememberContact(parsed, { name });
          setName("");
          setAddress("");
          setError(null);
          refresh();
        }}
      >
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre" className="h-10" />
        <Input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="0x…"
          className="h-10 font-mono"
        />
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        <Button type="submit" className="h-10 w-full">
          Guardar contacto
        </Button>
      </form>

      <ul className="mt-4 space-y-2 pb-4">
        {contacts.length === 0 ? (
          <li className="text-sm text-muted-foreground">Todavía no hay contactos.</li>
        ) : (
          contacts.map((contact) => (
            <li key={contact.address}>
              <Link
                href={`/contacts/${contact.address}`}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 hover:bg-white/[0.06]"
              >
                <span>
                  <span className="block text-sm font-medium">{contactLabel(contact)}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {shortAddress(contact.address)}
                  </span>
                </span>
                <span className="text-[11px] text-teal-300">Historial</span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
