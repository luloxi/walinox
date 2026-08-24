import { Interface, getAddress } from "ethers";
import { describe, expect, it } from "vitest";
import { encodeTransfer } from "@/lib/chain";
import { fromConnected } from "@/lib/connected-wallet";
import { USDT } from "@/lib/tokens";

const TO = "0x1111111111111111111111111111111111111111";
const TOKEN = USDT.address as `0x${string}`;

describe("ERC-20 transfer", () => {
  it("encodes transfer(to, amount) targeting the token", () => {
    const call = encodeTransfer(USDT.address, TO, "1500000");
    expect(call.to).toBe(getAddress(USDT.address));
    const iface = new Interface(["function transfer(address to, uint256 amount)"]);
    const decoded = iface.decodeFunctionData("transfer", call.data);
    expect(getAddress(decoded[0])).toBe(TO);
    expect(decoded[1].toString()).toBe("1500000");
  });

  it("injected wallet sends transfer calldata", async () => {
    const sent: unknown[] = [];
    const client = {
      chain: undefined,
      async sendTransaction(tx: unknown) {
        sent.push(tx);
        return "0xdead";
      },
      async signTypedData() {
        return "0x";
      },
    };
    const wallet = fromConnected(
      "0x2222222222222222222222222222222222222222",
      client as never,
    );
    const hash = await wallet.transfer(TOKEN, TO, "42");
    expect(hash).toBe("0xdead");
    const tx = sent[0] as { to: string; data: string; value: bigint };
    expect(tx.to.toLowerCase()).toBe(TOKEN.toLowerCase());
    expect(tx.value).toBe(BigInt(0));
    const iface = new Interface(["function transfer(address to, uint256 amount)"]);
    expect(iface.decodeFunctionData("transfer", tx.data)[1].toString()).toBe("42");
  });
});
