import { markCloudDirty } from "@/lib/backup";
import { getAddress, isAddress } from "ethers";
import { listReceipts, type Receipt } from "@/lib/receipts";

export type Contact = {
  address: string;
  name: string;
  note: string;
  createdAt: string;
  lastSeenAt: string;
};

export type ContactStore = {
  load: () => Contact[];
  save: (contacts: Contact[]) => void;
};

const STORAGE_KEY = "walinox.contacts";
export const DEFAULT_CONTACTS_SEED_KEY = "walinox.contacts.defaults";
export const CONTACT_UNDO_KEY = "walinox.contact.undo";

export const LULOX_ADDRESS = "0xfBD9Ca40386A8C632cf0529bbb16b4BEdB59a0A0";

export const DEFAULT_CONTACTS: { address: string; name: string }[] = [
  { address: LULOX_ADDRESS, name: "lulox.eth" },
];

export function memoryContactStore(seed: Contact[] = []): ContactStore {
  let contacts = [...seed];
  return {
    load: () => contacts,
    save: (next) => {
      contacts = [...next];
    },
  };
}

export function localStorageContactStore(key = STORAGE_KEY): ContactStore {
  return {
    load() {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as Contact[]) : [];
      } catch {
        return [];
      }
    },
    save(contacts) {
      localStorage.setItem(key, JSON.stringify(contacts));
      markCloudDirty();
    },
  };
}

let store: ContactStore = memoryContactStore();

export function setContactStore(next: ContactStore): void {
  store = next;
}

function currentStore(): ContactStore {
  if (typeof window !== "undefined") return localStorageContactStore();
  return store;
}

export function normalizeAddress(value: string): string {
  if (!isAddress(value)) throw new Error("Address inválida");
  return getAddress(value);
}

export function seedDefaultContacts(): void {
  if (typeof localStorage !== "undefined" && localStorage.getItem(DEFAULT_CONTACTS_SEED_KEY) === "1") {
    return;
  }
  for (const item of DEFAULT_CONTACTS) {
    try {
      if (!getContact(item.address)) rememberContact(item.address, { name: item.name });
    } catch {
      /* skip bad seed */
    }
  }
  if (typeof localStorage !== "undefined") localStorage.setItem(DEFAULT_CONTACTS_SEED_KEY, "1");
}

export function listContacts(): Contact[] {
  return currentStore()
    .load()
    .slice()
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export function namedContacts(): Contact[] {
  return listContacts().filter((contact) => contact.name.trim());
}

export type SuggestedContact = {
  address: string;
  lastAt: string;
  count: number;
};

export function receiptCounterpart(receipt: Receipt, me?: string): string | null {
  if (!me || !isAddress(me)) return null;
  const mine = me.toLowerCase();
  const owner = receipt.owner.toLowerCase();
  const spender = receipt.spender.toLowerCase();
  if (!isAddress(receipt.owner) || !isAddress(receipt.spender)) return null;
  if (owner === spender) return null;
  if (receipt.action !== "sent" && receipt.action !== "received" && receipt.action !== "signed") {
    return null;
  }
  if (owner === mine) return getAddress(receipt.spender);
  if (spender === mine) return getAddress(receipt.owner);
  return null;
}

export function suggestedContacts(me?: string, limit = 8): SuggestedContact[] {
  const known = new Set(namedContacts().map((contact) => contact.address.toLowerCase()));
  if (me && isAddress(me)) known.add(me.toLowerCase());
  const seen = new Map<string, SuggestedContact>();
  for (const receipt of listReceipts()) {
    const peer = receiptCounterpart(receipt, me);
    if (!peer) continue;
    const key = peer.toLowerCase();
    if (known.has(key)) continue;
    const prev = seen.get(key);
    if (prev) {
      prev.count += 1;
      if (receipt.at > prev.lastAt) prev.lastAt = receipt.at;
    } else {
      seen.set(key, { address: peer, lastAt: receipt.at, count: 1 });
    }
  }
  return [...seen.values()]
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt) || b.count - a.count)
    .slice(0, limit);
}

export function getContact(address: string): Contact | undefined {
  const key = normalizeAddress(address).toLowerCase();
  return currentStore()
    .load()
    .find((item) => item.address.toLowerCase() === key);
}

export function rememberContact(
  address: string,
  patch: { name?: string; note?: string; lastSeenAt?: string; createdAt?: string } = {},
): Contact {
  const checksum = normalizeAddress(address);
  const now = new Date().toISOString();
  const current = currentStore();
  const list = current.load();
  const index = list.findIndex((item) => item.address.toLowerCase() === checksum.toLowerCase());
  if (index >= 0) {
    const next: Contact = {
      ...list[index],
      name: patch.name?.trim() ? patch.name.trim() : list[index].name,
      note: patch.note !== undefined ? patch.note : list[index].note,
      lastSeenAt: patch.lastSeenAt ?? now,
    };
    const copy = [...list];
    copy[index] = next;
    current.save(copy);
    return next;
  }
  const created: Contact = {
    address: checksum,
    name: patch.name?.trim() ?? "",
    note: patch.note ?? "",
    createdAt: patch.createdAt ?? now,
    lastSeenAt: patch.lastSeenAt ?? now,
  };
  current.save([created, ...list]);
  return created;
}

export function replaceContacts(contacts: Contact[]): void {
  currentStore().save(
    contacts.filter((item) => {
      try {
        return Boolean(normalizeAddress(item.address));
      } catch {
        return false;
      }
    }),
  );
}

export function removeContact(address: string): Contact | undefined {
  const key = normalizeAddress(address).toLowerCase();
  const current = currentStore();
  const list = current.load();
  const found = list.find((item) => item.address.toLowerCase() === key);
  current.save(list.filter((item) => item.address.toLowerCase() !== key));
  return found;
}

export function contactLabel(contact: { address: string; name: string }): string {
  return contact.name.trim() || contact.address.slice(0, 6) + "…" + contact.address.slice(-4);
}

export function searchContacts(contacts: Contact[], query: string): Contact[] {
  const q = query.trim().toLowerCase();
  if (!q) return contacts;
  const hex = q.replace(/^0x/, "");
  return contacts.filter((contact) => {
    const name = contact.name.toLowerCase();
    const note = contact.note.toLowerCase();
    const address = contact.address.toLowerCase();
    const label = contactLabel(contact).toLowerCase();
    return (
      name.includes(q) ||
      note.includes(q) ||
      label.includes(q) ||
      address.includes(q) ||
      address.replace(/^0x/, "").includes(hex)
    );
  });
}

export function receiptsWith(address: string, me?: string): Receipt[] {
  const key = normalizeAddress(address).toLowerCase();
  const mine = me && isAddress(me) ? getAddress(me).toLowerCase() : null;
  return listReceipts().filter((receipt) => {
    const owner = receipt.owner.toLowerCase();
    const spender = receipt.spender.toLowerCase();
    if (owner !== key && spender !== key) return false;
    if (mine && owner === mine && spender === mine) return false;
    return true;
  });
}
