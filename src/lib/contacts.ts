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

export function listContacts(): Contact[] {
  return currentStore()
    .load()
    .slice()
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export function getContact(address: string): Contact | undefined {
  const key = normalizeAddress(address).toLowerCase();
  return currentStore()
    .load()
    .find((item) => item.address.toLowerCase() === key);
}

export function rememberContact(
  address: string,
  patch: { name?: string; note?: string } = {},
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
      lastSeenAt: now,
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
    createdAt: now,
    lastSeenAt: now,
  };
  current.save([created, ...list]);
  return created;
}

export function removeContact(address: string): void {
  const key = normalizeAddress(address).toLowerCase();
  const current = currentStore();
  current.save(current.load().filter((item) => item.address.toLowerCase() !== key));
}

export function contactLabel(contact: { address: string; name: string }): string {
  return contact.name.trim() || contact.address.slice(0, 6) + "…" + contact.address.slice(-4);
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
