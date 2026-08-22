import { describe, expect, it } from "vitest";
import {
  TERMS_VERSION,
  hasChosenSignMode,
  hasSignedTos,
  isGrantActive,
  loadSignMode,
  saveSignMode,
  saveTos,
  termsTypedData,
} from "@/lib/session";

const A = "0x1111111111111111111111111111111111111111";

describe("session terms", () => {
  it("builds EIP-712 terms bound to the signer", () => {
    const typed = termsTypedData(A, 1, "2026-01-01T00:00:00.000Z");
    expect(typed.domain.name).toBe("Walinox");
    expect(typed.domain.version).toBe(TERMS_VERSION);
    expect(typed.message.signer).toMatch(/^0x1111/i);
    expect(String(typed.message.text)).toMatch(/auto-custodia/);
  });

  it("stores ToS and defaults sign mode to every", () => {
    saveTos({ address: A, version: TERMS_VERSION, signature: "0xsig", at: new Date().toISOString() });
    expect(hasSignedTos(A)).toBe(true);
    expect(hasChosenSignMode(A)).toBe(false);
    expect(loadSignMode(A)).toBe("every");
    saveSignMode(A, "session");
    expect(hasChosenSignMode(A)).toBe(true);
    expect(loadSignMode(A)).toBe("session");
  });

  it("treats expired grants as inactive", () => {
    expect(isGrantActive({ address: A, expiry: 1, permissionsContext: "0xabc" }, 2_000)).toBe(false);
    expect(
      isGrantActive({ address: A, expiry: Math.floor(Date.now() / 1000) + 60, permissionsContext: "0xabc" }),
    ).toBe(true);
    expect(isGrantActive({ address: A, expiry: 9_999_999_999, permissionsContext: "" })).toBe(false);
  });
});
