import { describe, expect, it } from "vitest";
import { buildActivityReport } from "@/lib/activity";
import {
  forgetMonthlyReportDelivery,
  maybeDeliverMonthlyReport,
  monthTag,
  monthlyReportCopy,
  monthlyReportOn,
  previousMonth,
  setMonthlyReportOn,
} from "@/lib/monthly-report";
import { listInbox, memoryInboxStore, setInboxStore } from "@/lib/notify";
import { addReceipt, memoryStore, setReceiptStore } from "@/lib/receipts";

const ME = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PEER = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("monthly report", () => {
  it("labels the previous calendar month", () => {
    expect(monthTag(previousMonth(new Date(2026, 7, 22)))).toBe("2026-07");
  });

  it("writes a Spanish summary of the last month once", () => {
    setInboxStore(memoryInboxStore());
    setReceiptStore(memoryStore());
    setMonthlyReportOn(false);
    forgetMonthlyReportDelivery(ME);
    setMonthlyReportOn(true);
    addReceipt({
      action: "sent",
      channel: "online",
      owner: ME,
      spender: PEER,
      value: "10000000",
      token: "USDT",
      signature: "0x1",
      at: new Date(2026, 6, 10).toISOString(),
      arsPerUsdt: 1000,
    });
    expect(maybeDeliverMonthlyReport(ME, new Date(2026, 7, 22))).toBe(true);
    expect(maybeDeliverMonthlyReport(ME, new Date(2026, 7, 23))).toBe(false);
    const item = listInbox()[0];
    expect(item?.kind).toBe("report");
    expect(item?.title).toMatch(/julio/i);
    expect(item?.url).toBe("/summary");
    expect(monthlyReportOn()).toBe(true);
    const report = buildActivityReport([], { kind: "month", anchor: new Date(2026, 6, 1) });
    expect(monthlyReportCopy(report, "ARS").body).toMatch(/0 movimiento/);
  });
});
