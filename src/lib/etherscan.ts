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

/** ERC-20 transfer list for an address (actividad on-chain). */
export function etherscanAddressActivityUrl(address: string): string {
  return `${ETHERSCAN_ORIGIN}/address/${address}#tokentxns`;
}

export function etherscanTokenHolderUrl(token: string, address: string): string {
  return `${ETHERSCAN_ORIGIN}/token/${token}?a=${address}`;
}
