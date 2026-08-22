"use client";

import { useEffect, useState } from "react";
import { contactLabel, listContacts, type Contact } from "@/lib/contacts";

export function ContactPicker({
  onPick,
  selected,
}: {
  onPick: (contact: Contact) => void;
  selected?: string;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    setContacts(listContacts());
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
              active ? "bg-teal-400 text-zinc-950" : "bg-white/10 text-muted-foreground hover:bg-white/15"
            }`}
          >
            {contactLabel(contact)}
          </button>
        );
      })}
    </div>
  );
}
