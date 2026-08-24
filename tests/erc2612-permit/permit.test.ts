import { Wallet } from "ethers";
import { describe, expect, it } from "vitest";
import { buildPermit, encodePermitCall, validatePermitSignature } from "@/lib/permit";

const SPENDER = "0x1111111111111111111111111111111111111111";

describe("ERC-2612 permit (legacy path)", () => {
  it("signs and recovers owner", async () => {
    const wallet = Wallet.createRandom();
    const typed = buildPermit({
      owner: wallet.address,
      spender: SPENDER,
      value: "100000000",
      nonce: "0",
      deadline: "2000000000",
    });
    const signature = await wallet.signTypedData(typed.domain, typed.types, typed.message);
    const result = validatePermitSignature(typed, signature);
    expect(result.ok).toBe(true);
    const call = encodePermitCall(typed, signature);
    expect(call.data.startsWith("0xd505accf")).toBe(true);
  });

  it("rejects a mutated amount", async () => {
    const wallet = Wallet.createRandom();
    const typed = buildPermit({
      owner: wallet.address,
      spender: SPENDER,
      value: "1",
      nonce: "0",
      deadline: "2000000000",
    });
    const signature = await wallet.signTypedData(typed.domain, typed.types, typed.message);
    const mutated = buildPermit({
      owner: wallet.address,
      spender: SPENDER,
      value: "2",
      nonce: "0",
      deadline: "2000000000",
    });
    expect(validatePermitSignature(mutated, signature).ok).toBe(false);
  });
});
