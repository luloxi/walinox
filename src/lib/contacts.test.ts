import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTACTS,
  DEFAULT_CONTACTS_SEED_KEY,
  contactLabel,
  getContact,
  listContacts,
  memoryContactStore,
  rememberContact,
  removeContact,
  searchContacts,
  seedDefaultContacts,
  setContactStore,
} from "@/lib/contacts";

const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";

describe("contacts", () => {
  it("remembers, updates last seen, and labels by name", () => {
    setContactStore(memoryContactStore());
    const first = rememberContact(A, { name: "Almacén Sur" });
    rememberContact(B);
    rememberContact(A, { name: "Almacén Sur" });

    expect(getContact(A)?.name).toBe("Almacén Sur");
    expect(listContacts()).toHaveLength(2);
    expect(getContact(A)?.address).toBe(first.address);
    expect(contactLabel({ address: A, name: "" })).toMatch(/^0x1111/);
    expect(contactLabel(first)).toBe("Almacén Sur");

    removeContact(A);
    expect(getContact(A)).toBeUndefined();
    expect(listContacts()).toHaveLength(1);
  });

  it("seeds lulox.eth when the agenda is empty", () => {
    setContactStore(memoryContactStore());
    if (typeof localStorage !== "undefined") localStorage.removeItem(DEFAULT_CONTACTS_SEED_KEY);
    seedDefaultContacts();
    expect(getContact(DEFAULT_CONTACTS[0].address)?.name).toBe("lulox.eth");
  });

  it("searches by name, ens and address", () => {
    setContactStore(memoryContactStore());
    rememberContact(A, { name: "lulox.eth", note: "mentor" });
    rememberContact(B, { name: "Maru" });
    const all = listContacts();
    expect(searchContacts(all, "lulox")).toHaveLength(1);
    expect(searchContacts(all, ".eth")[0]?.name).toBe("lulox.eth");
    expect(searchContacts(all, "0x2222")[0]?.name).toBe("Maru");
    expect(searchContacts(all, "mentor")[0]?.name).toBe("lulox.eth");
    expect(searchContacts(all, "zzz")).toHaveLength(0);
  });
});
