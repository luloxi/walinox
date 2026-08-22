import { describe, expect, it } from "vitest";
import {
  CANDIDE_PUBLIC_MAINNET,
  TETHER_7702_DELEGATION,
  gaslessConfig,
} from "@/lib/gasless";
import { USDT } from "@/lib/tokens";
import { openWallet, randomSeedPhrase } from "@/lib/wallet";

describe("WDK 7702 gasless config", () => {
  it("pays gas in USDT via Candide public (no API key)", () => {
    const config = gaslessConfig();
    expect(config.bundlerUrl).toBe(CANDIDE_PUBLIC_MAINNET);
    expect(config.delegationAddress).toBe(TETHER_7702_DELEGATION);
    expect(config.paymasterToken.address).toBe(USDT.address);
    expect(config.paymasterUrl).toBeUndefined();
  });

  it("exposes approve and sendCalldata on the local WDK wallet", async () => {
    const wallet = await openWallet(randomSeedPhrase());
    expect(typeof wallet.approve).toBe("function");
    expect(typeof wallet.sendCalldata).toBe("function");
    expect(typeof wallet.transfer).toBe("function");
    wallet.dispose();
  });
});
