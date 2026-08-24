import { describe, expect, it } from "vitest";
import { classifyQvacFailure, detectQvacHost, officialQvacHost } from "@/lib/qvac-runtime";

describe("QVAC runtime probe", () => {
  it("classifies Node, Bare, Expo, and a plain browser", () => {
    expect(detectQvacHost({ process: { versions: { node: "22.0.0" } } })).toBe("node");
    expect(detectQvacHost({ Bare: {} })).toBe("bare");
    expect(detectQvacHost({ navigator: { product: "ReactNative" } })).toBe("expo");
    expect(detectQvacHost({ navigator: { product: "Gecko" } })).toBe("browser");
    expect(officialQvacHost("browser")).toBe(false);
    expect(officialQvacHost("node")).toBe(true);
  });

  it("treats missing native addons as unsupported, not a successful load", () => {
    expect(classifyQvacFailure("Cannot find module '@qvac/sdk'")).toBe("unsupported");
    expect(classifyQvacFailure("Failed to resolve module specifier @qvac/sdk")).toBe("unsupported");
    expect(classifyQvacFailure("Error loading dynamically imported module")).toBe("unsupported");
    expect(classifyQvacFailure("ENOSPC disk full")).toBe("failed");
    expect(classifyQvacFailure("fetch failed")).toBe("failed");
  });
});
