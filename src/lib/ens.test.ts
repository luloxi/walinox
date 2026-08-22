import { describe, expect, it } from "vitest";
import { isEnsName } from "@/lib/ens";

describe("isEnsName", () => {
  it("accepts ENS and Base names", () => {
    expect(isEnsName("vitalik.eth")).toBe(true);
    expect(isEnsName("alice.base.eth")).toBe(true);
    expect(isEnsName("shop.walinox.eth")).toBe(true);
  });

  it("rejects addresses and junk", () => {
    expect(isEnsName("0x1111111111111111111111111111111111111111")).toBe(false);
    expect(isEnsName("vitalik")).toBe(false);
    expect(isEnsName(".eth")).toBe(false);
    expect(isEnsName("")).toBe(false);
  });
});
