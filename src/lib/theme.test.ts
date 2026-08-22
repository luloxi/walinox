import { describe, expect, it } from "vitest";
import { THEME_KEY, isTheme, loadTheme, saveTheme } from "@/lib/theme";

describe("theme", () => {
  it("accepts only light or dark", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("light")).toBe(true);
    expect(isTheme("system")).toBe(false);
  });

  it("persists the choice", () => {
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
    expect(loadTheme()).toBe("dark");
    saveTheme("light");
    expect(store.get(THEME_KEY)).toBe("light");
    expect(loadTheme()).toBe("light");
    globalThis.localStorage = original;
  });
});
