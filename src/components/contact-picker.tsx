"use client";

import { useEffect, useState } from "react";
import { contactLabel, listContacts, seedDefaultContacts, type Contact } from "@/lib/contacts";

export function ContactPicker({
  onPick,
  selected,
}: {
  onPick: (contact: Contact) => void;
  selected?: string;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      seedDefaultContacts();
      setContacts(listContacts());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (contacts.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {contacts.slice(0, 12).map((contact) => {
        const active = selected?.toLowerCase() === contact.address.toLowerCase();
        return (
          <button
            key={contact.address}
            type="button"
            onClick={() => onPick(contact)}
            className={`cursor-pointer shrink-0 rounded-full px-3 py-1.5 text-xs ${
              active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted"
            }`}
          >
            {contactLabel(contact)}
          </button>
        );
      })}
    </div>
  );
}
