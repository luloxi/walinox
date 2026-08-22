"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contactLabel, namedContacts, seedDefaultContacts, type Contact } from "@/lib/contacts";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ContactPicker({
  onPick,
  selected,
  className,
}: {
  onPick: (contact: Contact) => void;
  selected?: string;
  className?: string;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      seedDefaultContacts();
      setContacts(namedContacts());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

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

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={cn("h-11 shrink-0 gap-1.5 px-3", className)}
        onClick={() => setOpen(true)}
      >
        <Users className="size-4" />
        Contactos
      </Button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
              onClick={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-popover p-5 ring-1 ring-border"
                onClick={(event) => event.stopPropagation()}
              >
                <p id={titleId} className="text-base font-semibold">
                  Elegir contacto
                </p>
                {contacts.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Todavía no hay contactos.</p>
                ) : (
                  <ul className="mt-3 space-y-1">
                    {contacts.map((contact) => {
                      const active = selected?.toLowerCase() === contact.address.toLowerCase();
                      return (
                        <li key={contact.address}>
                          <button
                            type="button"
                            className={cn(
                              "flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-3 text-left hover:bg-muted",
                              active ? "bg-muted" : "",
                            )}
                            onClick={() => {
                              onPick(contact);
                              setOpen(false);
                            }}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{contactLabel(contact)}</span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {shortAddress(contact.address)}
                              </span>
                            </span>
                            {active ? <span className="ml-3 shrink-0 text-[11px] text-primary">Elegido</span> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Button type="button" variant="outline" className="mt-4 h-10 w-full" onClick={() => setOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
