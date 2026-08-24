import { Interface, MaxUint256, getAddress } from "ethers";
import { describe, expect, it, vi } from "vitest";

const allowanceState = { value: 0n };

vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();
  return {
    ...actual,
    JsonRpcProvider: class {
      constructor() {}
    },
    Contract: class {
      async allowance() {
        return allowanceState.value;
      }
    },
  };
});

const { encodeApprove } = await import("@/lib/chain");
const { PERMIT2_ADDRESS, ensurePermit2Allowance } = await import("@/lib/permit2");
const { USDT } = await import("@/lib/tokens");

describe("Permit2 ERC-20 approve", () => {
  it("encodes approve(Permit2, max)", () => {
    const call = encodeApprove(USDT.address, PERMIT2_ADDRESS);
    expect(call.to).toBe(getAddress(USDT.address));
    const iface = new Interface(["function approve(address spender, uint256 amount)"]);
    const decoded = iface.decodeFunctionData("approve", call.data);
    expect(getAddress(decoded[0])).toBe(PERMIT2_ADDRESS);
    expect(decoded[1].toString()).toBe(MaxUint256.toString());
  });

  it("skips approve when allowance is already huge", async () => {
    allowanceState.value = MaxUint256;
    const approve = vi.fn(async () => "0x1");
    await ensurePermit2Allowance({ address: "0x1111111111111111111111111111111111111111", approve });
    expect(approve).not.toHaveBeenCalled();
  });

  it("resets then approves when a leftover allowance exists", async () => {
    allowanceState.value = BigInt(100);
    const approve = vi.fn(async () => "0x1");
    await ensurePermit2Allowance({ address: "0x1111111111111111111111111111111111111111", approve });
    expect(approve).toHaveBeenCalledTimes(2);
    expect(approve.mock.calls[0]).toEqual([USDT.address, PERMIT2_ADDRESS, "0"]);
    expect(approve.mock.calls[1]).toEqual([USDT.address, PERMIT2_ADDRESS]);
  });

  it("approves once when allowance is zero", async () => {
    allowanceState.value = BigInt(0);
    const approve = vi.fn(async () => "0x1");
    await ensurePermit2Allowance({ address: "0x1111111111111111111111111111111111111111", approve });
    expect(approve).toHaveBeenCalledTimes(1);
  });
});
