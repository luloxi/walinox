import { Wallet, getAddress, verifyTypedData } from "ethers";
import { describe, expect, it } from "vitest";
import {
  TERMS_VERSION,
  hasSignedTos,
  saveTos,
  termsText,
  termsTypedData,
} from "@/lib/session";

const A = "0x1111111111111111111111111111111111111111";

describe("terms-of-use EIP-712", () => {
  it("builds typed data bound to signer, version and copy", () => {
    const typed = termsTypedData(A, 1, "2026-01-01T00:00:00.000Z");
    expect(typed.domain.name).toBe("Walinox");
    expect(typed.domain.version).toBe(TERMS_VERSION);
    expect(typed.message.signer).toBe(getAddress(A));
    expect(String(typed.message.text)).toBe(termsText());
  });

  it("recovers the signer of accepted terms", async () => {
    const wallet = Wallet.createRandom();
    const typed = termsTypedData(wallet.address, 1, "2026-08-24T12:00:00.000Z");
    const signature = await wallet.signTypedData(typed.domain, typed.types, typed.message);
    const recovered = getAddress(
      verifyTypedData(typed.domain, typed.types, typed.message, signature),
    );
    expect(recovered).toBe(getAddress(wallet.address));
    saveTos({
      address: wallet.address,
      version: TERMS_VERSION,
      signature,
      at: String(typed.message.acceptedAt),
    });
    expect(hasSignedTos(wallet.address)).toBe(true);
  });

  it("rejects a signature over mutated terms text", async () => {
    const wallet = Wallet.createRandom();
    const typed = termsTypedData(wallet.address, 1, "2026-08-24T12:00:00.000Z");
    const signature = await wallet.signTypedData(typed.domain, typed.types, typed.message);
    const mutated = { ...typed.message, text: "other terms" };
    let recovered: string | undefined;
    try {
      recovered = getAddress(verifyTypedData(typed.domain, typed.types, mutated, signature));
    } catch {
      recovered = undefined;
    }
    expect(recovered).not.toBe(getAddress(wallet.address));
  });

  it("does not treat another version as signed", () => {
    saveTos({ address: A, version: "1", signature: "0xsig", at: "t" });
    expect(hasSignedTos(A, TERMS_VERSION)).toBe(false);
  });
});
