import { describe, expect, it } from "vitest";
import {
  contactLabel,
  getContact,
  listContacts,
  memoryContactStore,
  rememberContact,
  removeContact,
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
});
