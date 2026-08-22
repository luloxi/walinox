import { describe, expect, it } from "vitest";
import {
  addInboxItem,
  buildNotify,
  listInbox,
  markInboxRead,
  memoryInboxStore,
  mergeInbox,
  sameAddress,
  senderCopy,
  setInboxStore,
  unreadCount,
} from "@/lib/notify";

const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";

describe("notify copy", () => {
  it("builds Spanish recipient copy for USDT and pings", () => {
    const sent = buildNotify({ kind: "usdt", from: A, to: B, amount: "10", token: "USDT" });
    expect(sent.title).toBe("Te mandaron USDT");
    expect(sent.body).toContain("10 USDT");
    expect(sent.url).toBe("/");

    const ping = buildNotify({ kind: "ping", from: A, to: B, message: "Estoy en el local" });
    expect(ping.title).toBe("Walinox");
    expect(ping.body).toBe("Estoy en el local");
    expect(ping.url).toContain(A);
  });

  it("builds sender copy and skips self", () => {
    expect(senderCopy({ kind: "usdt", from: A, to: B, amount: "4" }).title).toBe("Enviaste USDT");
    expect(sameAddress(A, A.toUpperCase())).toBe(true);
    expect(sameAddress(A, B)).toBe(false);
  });
});

describe("inbox", () => {
  it("stores, counts unread, merges by id, and marks read", () => {
    setInboxStore(memoryInboxStore());
    addInboxItem(buildNotify({ kind: "usdt", from: A, to: B, amount: "1" }));
    addInboxItem(buildNotify({ kind: "ping", from: A, to: B }));
    expect(listInbox()).toHaveLength(2);
    expect(unreadCount()).toBe(2);

    const first = listInbox()[0];
    expect(mergeInbox([first])).toBe(0);
    markInboxRead(first.id);
    expect(unreadCount()).toBe(1);
    markInboxRead();
    expect(unreadCount()).toBe(0);
  });
});
