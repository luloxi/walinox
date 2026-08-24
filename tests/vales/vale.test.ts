import { Wallet, getAddress } from "ethers";
import { describe, expect, it } from "vitest";
import {
  COMPLIANCE_LINES,
  buildVale,
  decodeVale,
  encodeVale,
  hashTerms,
  hashVale,
  validateVale,
  type ValeEnvelope,
} from "@/lib/vale";

const HOLDER = "0x3333333333333333333333333333333333333333";

async function signedVale(opts?: { expires?: string; terms?: string }) {
  const wallet = Wallet.createRandom();
  const terms = opts?.terms ?? COMPLIANCE_LINES.join(" ");
  const typed = buildVale({
    tokenId: "1",
    productId: hashTerms("product-1"),
    title: "Cafe",
    issuer: wallet.address,
    holder: HOLDER,
    price: "12000000",
    expires: opts?.expires ?? "0",
    terms,
  });
  const signature = await wallet.signTypedData(typed.domain, typed.types, typed.message);
  const envelope: ValeEnvelope = {
    v: 1,
    kind: "vale",
    tokenId: typed.message.tokenId,
    productId: typed.message.productId,
    issuer: typed.message.issuer,
    holder: typed.message.holder,
    title: typed.message.title,
    price: typed.message.price,
    expires: typed.message.expires,
    terms,
    termsHash: typed.message.termsHash,
    issuerName: "Tostaduria",
    redemptionPlace: "Local",
    typedData: typed,
    signature,
  };
  return { wallet, envelope };
}

describe("vales EIP-712", () => {
  it("validates an issuer-signed vale", async () => {
    const { wallet, envelope } = await signedVale();
    const check = validateVale(envelope);
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(check.recovered).toBe(getAddress(wallet.address));
      expect(check.digest).toBe(hashVale(envelope.typedData));
    }
  });

  it("rejects a vale signed by someone else", async () => {
    const { envelope } = await signedVale();
    const other = Wallet.createRandom();
    envelope.signature = await other.signTypedData(
      envelope.typedData.domain,
      envelope.typedData.types,
      envelope.typedData.message,
    );
    const check = validateVale(envelope);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toMatch(/emisor/);
  });

  it("rejects swapped terms and expired vales", async () => {
    const swapped = await signedVale({ terms: "A" });
    swapped.envelope.terms = "B";
    expect(validateVale(swapped.envelope).ok).toBe(false);

    const expired = await signedVale({ expires: "1" });
    expect(validateVale(expired.envelope).ok).toBe(false);
  });

  it("round-trips encode/decode", async () => {
    const { envelope } = await signedVale();
    const back = decodeVale(encodeVale(envelope));
    expect(back.kind).toBe("vale");
    expect(back.issuer).toBe(envelope.issuer);
    expect(validateVale(back).ok).toBe(true);
  });
});
