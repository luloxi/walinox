import { Wallet, getAddress, verifyTypedData } from "ethers";
import { describe, expect, it } from "vitest";
import { fromConnected } from "@/lib/connected-wallet";
import { buildPermit2, validatePermit2Signature } from "@/lib/permit2";
import { termsTypedData } from "@/lib/session";
import { openWallet, randomSeedPhrase } from "@/lib/wallet";

const SPENDER = "0x1111111111111111111111111111111111111111";

describe("WDK local wallet vs injected wagmi", () => {
  it("local WDK signs Permit2 typed data that recovers the account", async () => {
    const wallet = await openWallet(randomSeedPhrase());
    expect(wallet.source).toBe("local");
    const typed = buildPermit2({
      spender: SPENDER,
      amount: "1",
      nonce: "9",
      deadline: "2000000000",
    });
    const signature = await wallet.signTypedData({
      domain: typed.domain,
      types: typed.types,
      message: typed.message as unknown as Record<string, unknown>,
    });
    expect(validatePermit2Signature(typed, signature, wallet.address).ok).toBe(true);
    wallet.dispose();
  });

  it("injected adapter signs Permit2 with PermitTransferFrom primary type", async () => {
    const eoa = Wallet.createRandom();
    const typed = buildPermit2({
      spender: SPENDER,
      amount: "5",
      nonce: "3",
      deadline: "2000000000",
    });
    let seenPrimary: string | undefined;
    const client = {
      chain: undefined,
      async sendTransaction() {
        return "0x";
      },
      async signTypedData(args: {
        primaryType: string;
        domain: object;
        types: object;
        message: object;
      }) {
        seenPrimary = args.primaryType;
        return eoa.signTypedData(args.domain as never, args.types as never, args.message as never);
      },
    };
    const wallet = fromConnected(eoa.address as `0x${string}`, client as never);
    expect(wallet.source).toBe("injected");
    const signature = await wallet.signTypedData({
      domain: typed.domain,
      types: typed.types,
      message: typed.message as unknown as Record<string, unknown>,
    });
    expect(seenPrimary).toBe("PermitTransferFrom");
    expect(validatePermit2Signature(typed, signature, eoa.address).ok).toBe(true);
  });

  it("injected adapter can sign terms of use", async () => {
    const eoa = Wallet.createRandom();
    const typed = termsTypedData(eoa.address, 1, "2026-08-24T00:00:00.000Z");
    const client = {
      async sendTransaction() {
        return "0x";
      },
      async signTypedData(args: { domain: object; types: object; message: object }) {
        return eoa.signTypedData(args.domain as never, args.types as never, args.message as never);
      },
    };
    const wallet = fromConnected(eoa.address as `0x${string}`, client as never);
    const signature = await wallet.signTypedData(typed);
    expect(
      getAddress(verifyTypedData(typed.domain, typed.types, typed.message, signature)),
    ).toBe(getAddress(eoa.address));
  });
});
