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

export function tokenFromInput(_input: string): TokenInfo {
  return USDT;
}

export function tokenByAddress(address: string): TokenInfo | undefined {
  return address.toLowerCase() === USDT.address.toLowerCase() ? USDT : undefined;
}
