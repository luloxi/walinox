import { describe, expect, it } from "vitest";
import { DEFAULT_DISPLAY, isFiatId, loadDisplay, saveDisplay } from "@/lib/display";

describe("display prefs", () => {
  it("defaults to Argentine pesos first, USDT second", () => {
    expect(DEFAULT_DISPLAY).toEqual({ fiat: "ARS", primary: "fiat" });
  });

  it("only accepts known fiats", () => {
    expect(isFiatId("ARS")).toBe(true);
    expect(isFiatId("USDT")).toBe(false);
    expect(isFiatId("XYZ")).toBe(false);
  });

  it("round-trips prefs", () => {
    const store = new Map<string, string>();
    const original = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
    expect(loadDisplay()).toEqual(DEFAULT_DISPLAY);
    saveDisplay({ fiat: "BRL", primary: "usdt" });
    expect(loadDisplay()).toEqual({ fiat: "BRL", primary: "usdt" });
    globalThis.localStorage = original;
  });
});
