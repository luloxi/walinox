import { describe, expect, it } from "vitest";
import { arsToUsdt, formatArs, formatUsdt, parsePriceField, usdtToArs } from "@/lib/fx";

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
});
