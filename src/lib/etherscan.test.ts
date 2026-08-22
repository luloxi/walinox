import { describe, expect, it } from "vitest";
import {
  etherscanAddressActivityUrl,
  etherscanAddressUrl,
  etherscanTokenHolderUrl,
  etherscanTxUrl,
  isTxHash,
} from "@/lib/etherscan";

describe("etherscan links", () => {
  it("detects a 32-byte tx hash and builds explorer URLs", () => {
    const hash = `0x${"ab".repeat(32)}`;
    expect(isTxHash(hash)).toBe(true);
    expect(isTxHash(`0x${"ab".repeat(65)}`)).toBe(false);
    expect(etherscanTxUrl(hash)).toBe(`https://etherscan.io/tx/${hash}`);
    const address = "0x1111111111111111111111111111111111111111";
    expect(etherscanAddressUrl(address)).toBe(`https://etherscan.io/address/${address}`);
    expect(etherscanAddressActivityUrl(address)).toBe(`https://etherscan.io/address/${address}#tokentxns`);
    expect(etherscanTokenHolderUrl("0xdAC17F958D2ee523a2206206994597C13D831ec7", address)).toContain(
      `?a=${address}`,
    );
  });
});
