import { describe, expect, it } from "vitest";
import { extractEnsName, isEnsName } from "@/lib/ens";

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

describe("extractEnsName", () => {
  it("pulls ENS and Basenames out of a sentence", () => {
    expect(extractEnsName("mandale 10.5 USDT a vitalik.eth")).toBe("vitalik.eth");
    expect(extractEnsName("enviale 3 a alice.base.eth porfa")).toBe("alice.base.eth");
  });

  it("does not treat amounts or hex as names", () => {
    expect(extractEnsName("mandale 10.5 USDT")).toBeUndefined();
    expect(extractEnsName(`mandale 10 a ${"0x1111111111111111111111111111111111111111"}`)).toBeUndefined();
  });
});
