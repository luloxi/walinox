import { describe, expect, it } from "vitest";
import { arsToUsdt, blueAt, formatArs, formatFiat, formatUsdt, parsePriceField, receiptRate, usdtToArs } from "@/lib/fx";

describe("fx", () => {
  it("converts USDT to ARS at the blue rate", () => {
    expect(usdtToArs(10, 1550)).toBe(15500);
    expect(arsToUsdt(15500, 1550)).toBe("10");
  });

  it("treats form input >= 100 as pesos", () => {
    expect(parsePriceField("13950", 1550)).toBe("9");
    expect(parsePriceField("9", 1550)).toBe("9");
  });

  it("formats Argentine pesos", () => {
    expect(formatArs(13950)).toMatch(/13\.950/);
    expect(formatArs(13950)).toMatch(/\$/);
  });

  it("formats USDT with Argentine grouping", () => {
    expect(formatUsdt(9)).toBe("9");
    expect(formatUsdt("12.5")).toBe("12,5");
  });

  it("formats other local currencies", () => {
    expect(formatFiat(10, "USD")).toMatch(/10/);
    expect(formatFiat(910, "VES")).toMatch(/Bs/);
  });

  it("uses the blue of that month, or the live rate", () => {
    expect(blueAt("2026-03-14T11:20:00.000Z")).toBe(1485);
    expect(blueAt("2019-01-01T00:00:00.000Z", 1600)).toBe(1600);
    expect(receiptRate({ at: "2026-08-12T00:00:00.000Z", arsPerUsdt: 1490 })).toBe(1490);
    expect(receiptRate({ at: "2026-08-12T00:00:00.000Z" })).toBe(1550);
  });
});
