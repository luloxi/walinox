import { Interface } from "ethers";
import { describe, expect, it } from "vitest";
import {
  buildPermit,
  encodePermitCall,
  hashPermit,
  splitPermitSignature,
  validatePermitSignature,
} from "@/lib/permit";
import { openWallet, randomSeedPhrase } from "@/lib/wallet";

const SPENDER = "0x1111111111111111111111111111111111111111";

describe("ERC-2612 permit sign and verify", () => {
  it("signs with WDK and recovers the owner", async () => {
    const wallet = await openWallet(randomSeedPhrase());
    const typed = buildPermit({
      owner: wallet.address,
      spender: SPENDER,
      value: "100000000",
      nonce: "0",
      deadline: "2000000000",
    });

    const signature = await wallet.signPermit(typed);
    const digest = hashPermit(typed);
    const result = validatePermitSignature(typed, signature);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.recovered).toBe(wallet.address);
      expect(result.digest).toBe(digest);
    }

    wallet.dispose();
  });

  it("rejects a mutated payload", async () => {
    const wallet = await openWallet(randomSeedPhrase());
    const typed = buildPermit({
      owner: wallet.address,
      spender: SPENDER,
      value: "100000000",
      nonce: "0",
      deadline: "2000000000",
    });
    const signature = await wallet.signPermit(typed);

    const mutated = buildPermit({
      owner: wallet.address,
      spender: SPENDER,
      value: "200000000",
      nonce: "0",
      deadline: "2000000000",
    });

    const result = validatePermitSignature(mutated, signature);
    expect(result.ok).toBe(false);
    expect(hashPermit(mutated)).not.toBe(hashPermit(typed));

    wallet.dispose();
  });

  it("rejects a signature from a different WDK key", async () => {
    const ownerWallet = await openWallet(randomSeedPhrase());
    const otherWallet = await openWallet(randomSeedPhrase());
    expect(otherWallet.address).not.toBe(ownerWallet.address);

    const typed = buildPermit({
      owner: ownerWallet.address,
      spender: SPENDER,
      value: "100000000",
      nonce: "1",
      deadline: "2000000000",
    });
    const wrongSignature = await otherWallet.signPermit(typed);
    const result = validatePermitSignature(typed, wrongSignature);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.recovered).toBe(otherWallet.address);
      expect(result.reason).toMatch(/does not match owner/);
    }

    ownerWallet.dispose();
    otherWallet.dispose();
  });

  it("encodes ERC-2612 permit() calldata from a WDK signature", async () => {
    const wallet = await openWallet(randomSeedPhrase());
    const typed = buildPermit({
      owner: wallet.address,
      spender: SPENDER,
      value: "100000000",
      nonce: "0",
      deadline: "2000000000",
    });
    const signature = await wallet.signPermit(typed);
    const call = encodePermitCall(typed, signature);
    const { v, r, s } = splitPermitSignature(signature);
    const iface = new Interface([
      "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
    ]);
    const decoded = iface.decodeFunctionData("permit", call.data);

    expect(call.to).toBe(typed.domain.verifyingContract);
    expect(call.data.startsWith("0xd505accf")).toBe(true);
    expect(decoded[0]).toBe(typed.message.owner);
    expect(decoded[1]).toBe(typed.message.spender);
    expect(decoded[2].toString()).toBe(typed.message.value);
    expect(decoded[3].toString()).toBe(typed.message.deadline);
    expect(Number(decoded[4])).toBe(v);
    expect(decoded[5]).toBe(r);
    expect(decoded[6]).toBe(s);

    wallet.dispose();
  });
});
