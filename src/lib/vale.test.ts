import { describe, expect, it } from "vitest";
import { openWallet, randomSeedPhrase } from "@/lib/wallet";
import {
  COMPLIANCE_LINES,
  buildVale,
  hashTerms,
  hashVale,
  nftMetadata,
  validateVale,
  type ValeEnvelope,
} from "@/lib/vale";

const HOLDER = "0x3333333333333333333333333333333333333333";

describe("physical product vale NFT", () => {
  it("signs an EIP-712 vale and recovers the issuer", async () => {
    const wallet = await openWallet(randomSeedPhrase());
    const terms = COMPLIANCE_LINES.join(" ");
    const typed = buildVale({
      tokenId: "1",
      productId: hashTerms("product-1"),
      title: "Café de especialidad 250g",
      issuer: wallet.address,
      holder: HOLDER,
      price: "12000000",
      terms,
    });
    const signature = await wallet.signTypedData({
      domain: typed.domain,
      types: typed.types,
      message: typed.message,
    });
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
      issuerName: "Tostaduría Sur",
      redemptionPlace: "Local — mostrador",
      typedData: typed,
      signature,
    };
    const check = validateVale(envelope);
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(check.recovered).toBe(wallet.address);
      expect(check.digest).toBe(hashVale(typed));
    }
    expect(nftMetadata(envelope).attributes.some((item) => item.value === "physical-voucher")).toBe(
      true,
    );
    wallet.dispose();
  });

  it("rejects a vale whose terms were swapped", async () => {
    const wallet = await openWallet(randomSeedPhrase());
    const typed = buildVale({
      tokenId: "2",
      productId: hashTerms("product-2"),
      title: "Vale panadería",
      issuer: wallet.address,
      holder: HOLDER,
      price: "1000000",
      terms: "términos A",
    });
    const signature = await wallet.signTypedData({
      domain: typed.domain,
      types: typed.types,
      message: typed.message,
    });
    const check = validateVale({
      v: 1,
      kind: "vale",
      tokenId: "2",
      productId: typed.message.productId,
      issuer: wallet.address,
      holder: HOLDER,
      title: "Vale panadería",
      price: "1000000",
      expires: "0",
      terms: "términos B",
      termsHash: typed.message.termsHash,
      issuerName: "Pan",
      redemptionPlace: "Local",
      typedData: typed,
      signature,
    });
    expect(check.ok).toBe(false);
    wallet.dispose();
  });
});
