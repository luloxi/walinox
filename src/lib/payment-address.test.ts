import { getAddress } from "ethers";
import { describe, expect, it } from "vitest";
import { parsePaymentAddress } from "@/lib/payment-address";
import { USDT } from "@/lib/tokens";

const ADDR = "0x742d35cc6634c0532925a3b844bc9e7595f0beb0";
const CHECK = getAddress(ADDR);

describe("parsePaymentAddress", () => {
  it("reads a raw checksummed address", () => {
    expect(parsePaymentAddress(ADDR)).toBe(CHECK);
  });

  it("reads EIP-681 from MetaMask / Rabby / Rainbow", () => {
    expect(parsePaymentAddress(`ethereum:${ADDR}`)).toBe(CHECK);
    expect(parsePaymentAddress(`ethereum:${ADDR}@1`)).toBe(CHECK);
    expect(parsePaymentAddress(`eth:${ADDR}`)).toBe(CHECK);
  });

  it("reads an ERC-20 transfer URI (USDT / Tether wallet)", () => {
    expect(
      parsePaymentAddress(
        `ethereum:${USDT.address}@1/transfer?address=${ADDR}&uint256=1000000`,
      ),
    ).toBe(CHECK);
    expect(parsePaymentAddress(`usdt:${ADDR}`)).toBe(CHECK);
    expect(parsePaymentAddress(`tether:${ADDR}`)).toBe(CHECK);
  });

  it("reads MetaMask and Trust deep links", () => {
    expect(parsePaymentAddress(`https://metamask.app.link/send/${ADDR}@1`)).toBe(CHECK);
    expect(
      parsePaymentAddress(`https://link.trustwallet.com/send?coin=60&address=${ADDR}`),
    ).toBe(CHECK);
  });

  it("reads Binance and Rabby JSON plus CAIP-10", () => {
    expect(
      parsePaymentAddress(JSON.stringify({ address: ADDR, coin: "USDT", network: "ETH" })),
    ).toBe(CHECK);
    expect(parsePaymentAddress(JSON.stringify({ chainId: 1, address: ADDR }))).toBe(CHECK);
    expect(parsePaymentAddress(`eip155:1:${ADDR}`)).toBe(CHECK);
    expect(parsePaymentAddress(`bnb:${ADDR}`)).toBe(CHECK);
  });

  it("uses spender from a Walinox permit QR", () => {
    expect(
      parsePaymentAddress(
        JSON.stringify({
          v: 1,
          kind: "permit2",
          owner: USDT.address,
          spender: ADDR,
          token: USDT.address,
        }),
      ),
    ).toBe(CHECK);
  });

  it("ignores the USDT contract when it is the only 0x in the payload", () => {
    expect(parsePaymentAddress(USDT.address)).toBeNull();
  });
});
