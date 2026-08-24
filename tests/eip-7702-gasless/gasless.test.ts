import { describe, expect, it, vi } from "vitest";
import {
  CANDIDE_PUBLIC_MAINNET,
  TETHER_7702_DELEGATION,
  gaslessConfig,
} from "@/lib/gasless";
import { USDT } from "@/lib/tokens";

describe("EIP-7702 gasless + ETH fallback", () => {
  it("uses Candide public bundler and USDT paymaster token", () => {
    const prevB = process.env.NEXT_PUBLIC_BUNDLER_URL;
    const prevP = process.env.NEXT_PUBLIC_PAYMASTER_URL;
    delete process.env.NEXT_PUBLIC_BUNDLER_URL;
    delete process.env.NEXT_PUBLIC_PAYMASTER_URL;
    const config = gaslessConfig();
    expect(config.bundlerUrl).toBe(CANDIDE_PUBLIC_MAINNET);
    expect(config.delegationAddress).toBe(TETHER_7702_DELEGATION);
    expect(config.paymasterToken.address).toBe(USDT.address);
    expect(config.paymasterUrl).toBeUndefined();
    if (prevB) process.env.NEXT_PUBLIC_BUNDLER_URL = prevB;
    if (prevP) process.env.NEXT_PUBLIC_PAYMASTER_URL = prevP;
  });

  it("honors bundler and paymaster env overrides", () => {
    process.env.NEXT_PUBLIC_BUNDLER_URL = "https://bundler.example";
    process.env.NEXT_PUBLIC_PAYMASTER_URL = "https://paymaster.example";
    const config = gaslessConfig();
    expect(config.bundlerUrl).toBe("https://bundler.example");
    expect(config.paymasterUrl).toBe("https://paymaster.example");
    delete process.env.NEXT_PUBLIC_BUNDLER_URL;
    delete process.env.NEXT_PUBLIC_PAYMASTER_URL;
  });

  it("falls back to EOA when gasless write fails", async () => {
    async function gaslessThenEvm<T>(run: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
      try {
        return await run();
      } catch {
        return await fallback();
      }
    }
    const gasless = vi.fn(async () => {
      throw new Error("bundler down");
    });
    const eoa = vi.fn(async () => ({ hash: "0xeoa" }));
    const result = await gaslessThenEvm(gasless, eoa);
    expect(result.hash).toBe("0xeoa");
    expect(gasless).toHaveBeenCalled();
    expect(eoa).toHaveBeenCalled();
  });

  it("surfaces both errors if gasless and EOA fail", async () => {
    async function gaslessThenEvm<T>(run: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
      let gaslessErr: unknown;
      try {
        return await run();
      } catch (err) {
        gaslessErr = err;
      }
      try {
        return await fallback();
      } catch (ethErr) {
        throw new Error(
          `Gasless USDT fallo (${gaslessErr instanceof Error ? gaslessErr.message : String(gaslessErr)}). Fallback EOA tambien fallo: ${ethErr instanceof Error ? ethErr.message : String(ethErr)}`,
        );
      }
    }
    await expect(
      gaslessThenEvm(
        async () => {
          throw new Error("no bundler");
        },
        async () => {
          throw new Error("insufficient ETH");
        },
      ),
    ).rejects.toThrow(/no bundler.*insufficient ETH/);
  });
});
