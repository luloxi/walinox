import { describe, expect, it } from "vitest";
import {
  amountUsdt,
  buildActivityReport,
  periodBounds,
  receiptActionLabel,
  receiptFlow,
  receiptOrigin,
  shiftAnchor,
} from "@/lib/activity";
import type { Receipt } from "@/lib/receipts";

const ME = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const STORE = "0x1111111111111111111111111111111111111111";
const PEER = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function receipt(partial: Partial<Receipt> & Pick<Receipt, "action" | "owner" | "spender" | "value">): Receipt {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    at: partial.at ?? "2026-03-10T12:00:00.000Z",
    channel: partial.channel ?? "online",
    token: partial.token ?? "USDT",
    signature: partial.signature ?? "0x",
    ...partial,
  };
}

describe("activity", () => {
  it("reads human and base-unit amounts", () => {
    expect(amountUsdt("10")).toBe(10);
    expect(amountUsdt("12.50")).toBe(12.5);
    expect(amountUsdt("10000000")).toBe(10);
    expect(amountUsdt("667111")).toBe(0.667111);
    expect(amountUsdt("500000")).toBe(0.5);
  });

  it("classifies sent as expense and received as income", () => {
    expect(receiptFlow(receipt({ action: "sent", owner: ME, spender: PEER, value: "1" }), ME)).toBe("out");
    expect(receiptFlow(receipt({ action: "received", owner: PEER, spender: ME, value: "1" }), ME)).toBe("in");
    const paidStore = receipt({ action: "sent", owner: PEER, spender: ME, value: "667111" });
    expect(receiptFlow(paidStore, ME)).toBe("in");
    expect(receiptActionLabel(paidStore, ME)).toBe("Recibiste");
    expect(receiptActionLabel(receipt({ action: "sent", owner: ME, spender: PEER, value: "1" }), ME)).toBe(
      "Enviaste",
    );
    const failed = receipt({ action: "failed", owner: ME, spender: PEER, value: "2000000" });
    expect(receiptFlow(failed, ME)).toBe("none");
    expect(receiptActionLabel(failed, ME)).toBe("Falló");
    expect(receiptOrigin(receipt({ action: "issued", owner: ME, spender: PEER, value: "1", token: "VALE" }))).toBe(
      "tienda",
    );
    expect(receiptOrigin(receipt({ action: "sent", owner: ME, spender: STORE, value: "1" }), [STORE], ME)).toBe(
      "tienda",
    );
    expect(receiptOrigin(receipt({ action: "sent", owner: ME, spender: PEER, value: "1" }), [STORE, ME], ME)).toBe(
      "personal",
    );
  });

  it("builds month vs all reports and splits store/personal", () => {
    const rows = [
      receipt({ action: "sent", owner: ME, spender: PEER, value: "5000000", at: "2026-03-02T00:00:00.000Z" }),
      receipt({
        action: "sent",
        owner: ME,
        spender: STORE,
        value: "3000000",
        at: "2026-03-08T00:00:00.000Z",
      }),
      receipt({
        action: "received",
        owner: PEER,
        spender: ME,
        value: "8000000",
        at: "2026-01-04T00:00:00.000Z",
      }),
    ];
    const march = buildActivityReport(rows, {
      kind: "month",
      anchor: new Date("2026-03-15T00:00:00.000Z"),
      me: ME,
      storeIssuers: [STORE],
    });
    expect(march.label).toMatch(/Marzo 2026/);
    expect(march.expense).toBe(8);
    expect(march.income).toBe(0);
    expect(march.store).toBe(3);
    expect(march.personal).toBe(5);

    const all = buildActivityReport(rows, { kind: "all", me: ME, storeIssuers: [STORE] });
    expect(all.income).toBe(8);
    expect(all.incomeArs).toBeGreaterThan(0);
    expect(all.buckets.length).toBeGreaterThanOrEqual(2);
  });

  it("shifts month anchors and labels quarters", () => {
    const next = shiftAnchor(new Date(2026, 2, 15), "month", -1);
    expect(periodBounds("month", next).label).toBe("Febrero 2026");
    expect(periodBounds("quarter", new Date(2026, 4, 15)).label).toBe("T2 2026");
  });
});
