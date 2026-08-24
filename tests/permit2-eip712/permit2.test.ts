import { Interface, Wallet, getAddress } from "ethers";
import { describe, expect, it } from "vitest";
import {
  PERMIT2_ADDRESS,
  buildPermit2,
  encodePermit2TransferFrom,
  explainPermit2SettleError,
  settlePermit2Envelope,
  validatePermit2Signature,
} from "@/lib/permit2";
import { USDT } from "@/lib/tokens";

const SPENDER = "0x1111111111111111111111111111111111111111";

async function signedPermit2(wallet = Wallet.createRandom()) {
  const typed = buildPermit2({
    spender: SPENDER,
    amount: "100000000",
    nonce: "1",
    deadline: "2000000000",
  });
  const signature = await wallet.signTypedData(typed.domain, typed.types, typed.message);
  return { wallet, typed, signature };
}

describe("Permit2 EIP-712 / permitTransferFrom", () => {
  it("accepts a valid PermitTransferFrom signature", async () => {
    const { wallet, typed, signature } = await signedPermit2();
    const result = validatePermit2Signature(typed, signature, wallet.address);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.recovered).toBe(getAddress(wallet.address));
  });

  it("rejects a bad signature from another key", async () => {
    const { typed } = await signedPermit2();
    const other = Wallet.createRandom();
    const signature = await other.signTypedData(typed.domain, typed.types, typed.message);
    const result = validatePermit2Signature(typed, signature, typed.message.spender);
    expect(result.ok).toBe(false);
  });

  it("rejects an expired permit", async () => {
    const wallet = Wallet.createRandom();
    const typed = buildPermit2({
      spender: SPENDER,
      amount: "1",
      nonce: "1",
      deadline: "1",
    });
    const signature = await wallet.signTypedData(typed.domain, typed.types, typed.message);
    const result = validatePermit2Signature(typed, signature, wallet.address, 2);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/vencido/i);
  });

  it("rejects zero amount", async () => {
    const wallet = Wallet.createRandom();
    const typed = buildPermit2({
      spender: SPENDER,
      amount: "0",
      nonce: "1",
      deadline: "2000000000",
    });
    const signature = await wallet.signTypedData(typed.domain, typed.types, typed.message);
    const result = validatePermit2Signature(typed, signature, wallet.address);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Monto inválido/);
  });

  it("encodes permitTransferFrom to Permit2", async () => {
    const { wallet, typed, signature } = await signedPermit2();
    const call = encodePermit2TransferFrom(typed, signature, wallet.address);
    expect(call.to).toBe(PERMIT2_ADDRESS);
    const iface = new Interface([
      "function permitTransferFrom(((address token,uint256 amount) permitted,uint256 nonce,uint256 deadline) permit,(address to,uint256 requestedAmount) transferDetails,address owner,bytes signature)",
    ]);
    const decoded = iface.decodeFunctionData("permitTransferFrom", call.data);
    expect(getAddress(decoded[0].permitted.token)).toBe(USDT.address);
    expect(getAddress(decoded[1].to)).toBe(SPENDER);
    expect(getAddress(decoded[2])).toBe(getAddress(wallet.address));
  });

  it("settles via injected send and maps TRANSFER_FROM_FAILED", async () => {
    const { wallet, typed, signature } = await signedPermit2();
    const hash = await settlePermit2Envelope(
      {
        owner: wallet.address,
        spender: typed.message.spender,
        token: typed.message.permitted.token,
        value: typed.message.permitted.amount,
        signature,
        typedData: {
          domain: { chainId: typed.domain.chainId },
          message: typed.message as unknown as Record<string, unknown>,
        },
      },
      async () => "0xabc",
    );
    expect(hash).toBe("0xabc");

    await expect(
      settlePermit2Envelope(
        {
          owner: wallet.address,
          spender: typed.message.spender,
          token: typed.message.permitted.token,
          value: typed.message.permitted.amount,
          signature,
          typedData: {
            domain: { chainId: typed.domain.chainId },
            message: typed.message as unknown as Record<string, unknown>,
          },
        },
        async () => {
          throw new Error('execution reverted: "TRANSFER_FROM_FAILED"');
        },
      ),
    ).rejects.toThrow(/aprobar Permit2/);
  });

  it("explains bundler estimate failures", () => {
    expect(explainPermit2SettleError(new Error("eth_estimateUserOperationGas bundler"))).toMatch(
      /bundler gasless/i,
    );
  });
});
