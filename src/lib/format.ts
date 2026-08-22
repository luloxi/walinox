export function shortAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatTokenAmount(value: string, decimals = 6, symbol = "USDC"): string {
  const padded = value.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals) || "0";
  const frac = padded.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac} ${symbol}` : `${whole} ${symbol}`;
}

export function formatDeadline(unixSeconds: string): string {
  const date = new Date(Number(unixSeconds) * 1000);
  if (Number.isNaN(date.getTime())) return unixSeconds;
  return date.toLocaleString();
}
