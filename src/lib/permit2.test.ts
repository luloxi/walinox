import { Interface, getAddress } from "ethers";
import { describe, expect, it } from "vitest";
import {
  PERMIT2_ADDRESS,
  buildPermit2,
  encodePermit2TransferFrom,
  validatePermit2Signature,
} from "@/lib/permit2";
import { USDT } from "@/lib/tokens";
import { openWallet, randomSeedPhrase } from "@/lib/wallet";

const SPENDER = "0x1111111111111111111111111111111111111111";

describe("Permit2 USDT path", () => {
  it("signs PermitTransferFrom with WDK and encodes permitTransferFrom", async () => {
    const wallet = await openWallet(randomSeedPhrase());
    const typed = buildPermit2({
      spender: SPENDER,
      amount: "100000000",
      nonce: "1",
      deadline: "2000000000",
    });
    const signature = await wallet.signTypedData({
      domain: typed.domain,
      types: typed.types,
      message: typed.message as unknown as Record<string, unknown>,
    });
    const result = validatePermit2Signature(typed, signature, wallet.address);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.recovered).toBe(wallet.address);

    const call = encodePermit2TransferFrom(typed, signature, wallet.address);
    expect(call.to).toBe(PERMIT2_ADDRESS);

    const iface = new Interface([
      "function permitTransferFrom(((address token,uint256 amount) permitted,uint256 nonce,uint256 deadline) permit,(address to,uint256 requestedAmount) transferDetails,address owner,bytes signature)",
    ]);
    const decoded = iface.decodeFunctionData("permitTransferFrom", call.data);
    expect(getAddress(decoded[0].permitted.token)).toBe(USDT.address);
    expect(decoded[0].permitted.amount.toString()).toBe("100000000");
    expect(getAddress(decoded[1].to)).toBe(SPENDER);
    expect(decoded[1].requestedAmount.toString()).toBe("100000000");
    expect(getAddress(decoded[2])).toBe(wallet.address);

    wallet.dispose();
  });
});
