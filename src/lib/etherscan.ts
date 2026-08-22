export const ETHERSCAN_ORIGIN = "https://etherscan.io";

export function isTxHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function etherscanTxUrl(hash: string): string {
  return `${ETHERSCAN_ORIGIN}/tx/${hash}`;
}

export function etherscanAddressUrl(address: string): string {
  return `${ETHERSCAN_ORIGIN}/address/${address}`;
}
