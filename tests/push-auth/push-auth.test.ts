import { Wallet } from "ethers";
import { describe, expect, it } from "vitest";
import { pushAuthTypedData, verifyPushAuth } from "@/lib/push-auth";

describe("push-auth EIP-712", () => {
  it("accepts a fresh signature from the account", async () => {
    const wallet = Wallet.createRandom();
    const ts = Date.now();
    const typed = pushAuthTypedData(wallet.address, "subscribe", ts);
    const signature = await wallet.signTypedData(typed.domain, typed.types, typed.message);
    const result = verifyPushAuth({
      address: wallet.address,
      action: "subscribe",
      ts,
      signature,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects expired, wrong-key, and malformed signatures", async () => {
    const wallet = Wallet.createRandom();
    const other = Wallet.createRandom();
    const ts = Date.now();
    const typed = pushAuthTypedData(wallet.address, "subscribe", ts);
    const signature = await wallet.signTypedData(typed.domain, typed.types, typed.message);
    const otherSig = await other.signTypedData(typed.domain, typed.types, typed.message);

    expect(
      verifyPushAuth({
        address: wallet.address,
        action: "subscribe",
        ts: ts - 10 * 60 * 1000,
        signature,
      }).ok,
    ).toBe(false);
    expect(
      verifyPushAuth({ address: wallet.address, action: "subscribe", ts, signature: otherSig }).ok,
    ).toBe(false);
    expect(
      verifyPushAuth({ address: wallet.address, action: "subscribe", ts, signature: "bad" }).ok,
    ).toBe(false);
  });
});
