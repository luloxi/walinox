import { describe, expect, it } from "vitest";
import { spark24h, sparkPath } from "@/lib/balance-spark";
import type { Receipt } from "@/lib/receipts";

const ME = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PEER = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const NOW = Date.parse("2026-08-23T12:00:00.000Z");
const TX = `0x${"ab".repeat(32)}`;

function row(partial: Partial<Receipt> & Pick<Receipt, "action" | "value" | "at">): Receipt {
  return {
    id: partial.id ?? partial.at,
    channel: "online",
    token: "USDT",
    signature: TX,
    owner: partial.action === "received" ? PEER : ME,
    spender: partial.action === "received" ? ME : PEER,
    ...partial,
  };
}

describe("spark24h", () => {
  it("walks receipts backwards from the current USDT balance", () => {
    const { points, deltaUsdt } = spark24h(
      [
        row({ action: "sent", value: "10", at: "2026-08-23T10:00:00.000Z" }),
        row({ action: "received", value: "40", at: "2026-08-23T06:00:00.000Z" }),
      ],
      ME,
      100,
      NOW,
    );
    expect(deltaUsdt).toBe(30);
    expect(points[0]?.usdt).toBe(70);
    expect(points[points.length - 1]?.usdt).toBe(100);
  });

  it("ignores movements older than 24h and vale receipts", () => {
    const { deltaUsdt } = spark24h(
      [
        row({ action: "sent", value: "99", at: "2026-08-21T12:00:00.000Z" }),
        row({ action: "received", value: "5", at: "2026-08-23T11:00:00.000Z", token: "VALE" }),
      ],
      ME,
      50,
      NOW,
    );
    expect(deltaUsdt).toBe(0);
  });

  it("ignores unsigned QR permits so they do not swing the on-chain 24h", () => {
    const { deltaUsdt } = spark24h(
      [
        row({
          action: "sent",
          value: "667111",
          at: "2026-08-23T11:06:47.000Z",
          channel: "qr",
          signature: `0x${"cd".repeat(65)}`,
          owner: PEER,
          spender: ME,
        }),
      ],
      ME,
      7.85,
      NOW,
    );
    expect(deltaUsdt).toBe(0);
  });

  it("draws a flat path when the balance did not move", () => {
    const { line } = sparkPath(
      [
        { at: NOW - 86_400_000, usdt: 10 },
        { at: NOW, usdt: 10 },
      ],
      100,
      40,
    );
    expect(line).toMatch(/^M /);
    expect(line).toContain("20.0");
  });
});
