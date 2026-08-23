import { describe, expect, it } from "vitest";
import { TERMS_VERSION, hasSignedTos, saveTos, termsTypedData } from "@/lib/session";

const A = "0x1111111111111111111111111111111111111111";

describe("session terms", () => {
  it("builds EIP-712 terms bound to the signer", () => {
    const typed = termsTypedData(A, 1, "2026-01-01T00:00:00.000Z");
    expect(typed.domain.name).toBe("Walinox");
    expect(typed.domain.version).toBe(TERMS_VERSION);
    expect(typed.message.signer).toMatch(/^0x1111/i);
    expect(String(typed.message.text)).toMatch(/auto-custodia/);
  });

  it("stores ToS per address", () => {
    saveTos({ address: A, version: TERMS_VERSION, signature: "0xsig", at: new Date().toISOString() });
    expect(hasSignedTos(A)).toBe(true);
  });
});
