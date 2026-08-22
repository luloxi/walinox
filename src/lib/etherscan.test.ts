import { describe, expect, it } from "vitest";
import { etherscanAddressUrl, etherscanTxUrl, isTxHash } from "@/lib/etherscan";

describe("etherscan links", () => {
  it("detects a 32-byte tx hash and builds explorer URLs", () => {
    const hash = `0x${"ab".repeat(32)}`;
    expect(isTxHash(hash)).toBe(true);
    expect(isTxHash(`0x${"ab".repeat(65)}`)).toBe(false);
    expect(etherscanTxUrl(hash)).toBe(`https://etherscan.io/tx/${hash}`);
    expect(etherscanAddressUrl("0x1111111111111111111111111111111111111111")).toBe(
      "https://etherscan.io/address/0x1111111111111111111111111111111111111111",
    );
  });
});
