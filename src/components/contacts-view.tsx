"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { isAddress } from "ethers";
import { Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CONTACT_UNDO_KEY,
  contactLabel,
  namedContacts,
  rememberContact,
  searchContacts,
  seedDefaultContacts,
  suggestedContacts,
  type Contact,
  type SuggestedContact,
} from "@/lib/contacts";
import { EmptyState, SectionLabel } from "@/components/empty-state";
import { SaveContact } from "@/components/save-contact";
import { useWallet } from "@/components/wallet-provider";
import { parsePaymentAddress } from "@/lib/payment-address";
import { seedLivedIn } from "@/lib/seed";
import { isEnsName, resolveEns } from "@/lib/ens";
import { shortAddress } from "@/lib/format";
import { QvacHint } from "@/components/qvac-hint";

export function ContactsView() {
  const { wallet } = useWallet();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedContact[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<Contact | null>(null);
  const titleId = useId();
  const visible = useMemo(() => searchContacts(contacts, query), [contacts, query]);

  function refresh() {
    seedLivedIn(wallet?.address);
    seedDefaultContacts();
    setContacts(namedContacts());
    setSuggestions(suggestedContacts(wallet?.address));
  }

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [wallet?.address]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CONTACT_UNDO_KEY);
      if (!raw) return;
      sessionStorage.removeItem(CONTACT_UNDO_KEY);
      const contact = JSON.parse(raw) as Contact;
      if (!contact?.address) return;
      setUndo(contact);
      const timer = window.setTimeout(() => setUndo(null), 5000);
      return () => window.clearTimeout(timer);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const raw = address.trim();
      let parsed = parsePaymentAddress(raw) ?? (isAddress(raw) ? raw : null);
      if (!parsed && isEnsName(raw)) parsed = await resolveEns(raw);
      if (!parsed) {
        setError("Address o ENS inválido");
        return;
      }
      rememberContact(parsed, { name: name.trim() || (isEnsName(raw) ? raw : "") });
      setName("");
      setAddress("");
      setOpen(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  function restore() {
    if (!undo) return;
    rememberContact(undo.address, {
      name: undo.name,
      note: undo.note,
      createdAt: undo.createdAt,
      lastSeenAt: undo.lastSeenAt,
    });
    setUndo(null);
    refresh();
  }

  return (
    <div className="flex w-full flex-col pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, ENS o address"
          className="h-11 sm:min-w-0 sm:flex-1"
          aria-label="Buscar contactos"
        />
        <Button type="button" className="h-11 shrink-0 sm:px-5" onClick={() => setOpen(true)}>
          Nuevo
        </Button>
      </div>

      {suggestions.length > 0 && !query.trim() ? (
        <section className="mt-6 space-y-2">
          <SectionLabel>Sugeridos</SectionLabel>
          <p className="text-xs text-muted-foreground">De tus movimientos recientes</p>
          <ul className="space-y-2">
            {suggestions.map((item) => (
              <li key={item.address}>
                <SaveContact
                  address={item.address}
                  hint={`${item.count} ${item.count === 1 ? "movimiento" : "movimientos"}`}
                  onSaved={refresh}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {contacts.length > 0 && suggestions.length > 0 && !query.trim() ? (
        <SectionLabel className="mt-6">Agenda</SectionLabel>
      ) : null}

      {visible.length > 0 ? (
        <ul
          className={`grid gap-2 sm:grid-cols-2 xl:grid-cols-3 ${
            contacts.length > 0 && suggestions.length > 0 && !query.trim() ? "mt-2" : "mt-5"
          }`}
        >
          {visible.map((contact) => (
            <li key={contact.address}>
              <Link
                href={`/contacts/${contact.address}`}
                className="flex h-full cursor-pointer items-center justify-between rounded-2xl border border-border bg-card px-3 py-3 transition-colors hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{contactLabel(contact)}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {shortAddress(contact.address)}
                  </span>
                </span>
                <span className="ml-3 shrink-0 text-[11px] text-primary">Historial</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : contacts.length === 0 && suggestions.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Users}
          title="Todavía no hay contactos"
          body="Guardá gente con la que mandás o cobrás para encontrarlos rápido."
          action={
            <Button type="button" className="h-11" onClick={() => setOpen(true)}>
              Nuevo contacto
            </Button>
          }
        />
      ) : query.trim() ? (
        <EmptyState className="mt-6" icon={Search} title="Sin resultados" body="Probá otro nombre, ENS o address." />
      ) : null}

      {undo
        ? createPortal(
            <div className="fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 md:bottom-8">
              <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-border bg-popover px-4 py-3 shadow-lg">
                <p className="min-w-0 truncate text-sm">
                  Se olvidó <span className="font-medium">{contactLabel(undo)}</span>
                </p>
                <Button type="button" variant="secondary" className="h-9 shrink-0" onClick={restore}>
                  Deshacer
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
              onClick={() => setOpen(false)}
            >
              <form
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="w-full max-w-md space-y-3 rounded-3xl bg-popover p-6 ring-1 ring-border"
                onClick={(event) => event.stopPropagation()}
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
              >
                <p id={titleId} className="text-base font-semibold">
                  Nuevo contacto
                </p>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre" className="h-11" />
                <Input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="0x… o lulox.eth"
                  className="h-11 font-mono"
                />
                {error ? <p className="text-xs text-destructive">{error}</p> : null}
                <QvacHint
                  task="contact"
                  placeholder="guardá a María 0x… o lulox.eth"
                  onFill={(intent) => {
                    if (intent.to) setAddress(intent.to);
                    if (intent.name) setName(intent.name);
                    setError(null);
                  }}
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setOpen(false)}>
                    Cerrar
                  </Button>
                  <Button type="submit" className="h-11 flex-1" disabled={busy}>
                    {busy ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
