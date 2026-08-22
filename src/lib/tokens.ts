export type PermitKind = "erc2612" | "permit2";

export type TokenInfo = {
  symbol: string;
  name: string;
  version: string;
  address: string;
  chainId: number;
  decimals: number;
  permit: PermitKind;
};

export const USDT: TokenInfo = {
  symbol: "USDT",
  name: "Tether USD",
  version: "1",
  address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  chainId: 1,
  decimals: 6,
  permit: "permit2",
};

export const USDC: TokenInfo = {
  symbol: "USDC",
  name: "USD Coin",
  version: "2",
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  chainId: 1,
  decimals: 6,
  permit: "erc2612",
};

const TABLE = [USDT, USDC];

export function tokenFromInput(input: string): TokenInfo {
  if (/\bUSDT0\b/i.test(input)) return USDC;
  if (/\bUSDT\b/i.test(input)) return USDT;
  if (/\bUSDC\b/i.test(input)) return USDC;
  const addr = input.match(/0x[a-fA-F0-9]{40}/g)?.find((value) =>
    TABLE.some((token) => token.address.toLowerCase() === value.toLowerCase()),
  );
  if (addr) {
    return TABLE.find((token) => token.address.toLowerCase() === addr.toLowerCase()) ?? USDC;
  }
  return USDC;
}

export function tokenByAddress(address: string): TokenInfo | undefined {
  return TABLE.find((token) => token.address.toLowerCase() === address.toLowerCase());
}
