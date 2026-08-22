import { getAddress, isAddress } from "ethers";
import { USDT } from "@/lib/tokens";

const SCHEME = /^(?:ethereum|eth|ether|usdt|tether|usd₮|binance|bnb|bsc|pay):/i;

function hexes(value: string): string[] {
  return Array.from(value.matchAll(/0x[a-fA-F0-9]{40}/gi), (match) => match[0]);
}

const IGNORE = new Set([
  USDT.address.toLowerCase(),
  "0x0000000000000000000000000000000000000000",
]);

function checksum(value: string): string | null {
  try {
    return isAddress(value) ? getAddress(value) : null;
  } catch {
    return null;
  }
}

function pick(candidates: string[]): string | null {
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const checked = checksum(candidate);
    if (!checked) continue;
    const key = checked.toLowerCase();
    if (IGNORE.has(key) || seen.has(key)) continue;
    seen.add(key);
  }
  if (seen.size === 1) return getAddress([...seen][0]);
  for (const candidate of candidates) {
    const checked = checksum(candidate);
    if (checked && !IGNORE.has(checked.toLowerCase())) return checked;
  }
  return null;
}

function fromQuery(query: string): string | null {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  for (const key of ["address", "to", "recipient", "wallet", "account", "a", "addr"]) {
    const value = params.get(key);
    if (value) {
      const checked = checksum(value);
      if (checked) return checked;
    }
  }
  return pick(hexes(query));
}

function fromEip681(raw: string): string | null {
  const stripped = raw.replace(SCHEME, "").replace(/^pay-/i, "");
  const [pathAndRest, query = ""] = stripped.split("?");
  const fromParams = query ? fromQuery(query) : null;
  if (fromParams) return fromParams;

  const path = pathAndRest.split("/")[0] ?? "";
  const target = path.split("@")[0] ?? "";
  const fn = pathAndRest.split("/")[1]?.split("?")[0] ?? "";
  if (/transfer/i.test(fn)) {
    return fromParams;
  }
  const checked = checksum(target);
  if (checked && !IGNORE.has(checked.toLowerCase())) return checked;
  return pick(hexes(stripped));
}

function walkJson(value: unknown, out: string[], prefer: string[]): void {
  if (typeof value === "string") {
    if (checksum(value)) out.push(value);
    out.push(...hexes(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkJson(item, out, prefer);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (record.kind === "permit2" || record.kind === "erc2612") {
    if (typeof record.spender === "string") prefer.push(record.spender);
  }
  if (record.kind === "charge" && typeof record.to === "string") prefer.push(record.to);
  for (const key of ["address", "to", "recipient", "wallet", "account", "target", "spender"]) {
    const field = record[key];
    if (typeof field === "string" && checksum(field)) prefer.push(field);
  }
  for (const item of Object.values(record)) walkJson(item, out, prefer);
}

function fromJson(raw: string): string | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    const prefer: string[] = [];
    const rest: string[] = [];
    walkJson(parsed, rest, prefer);
    return pick(prefer) ?? pick(rest);
  } catch {
    return null;
  }
}

function fromHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const fromParams = fromQuery(url.search);
    if (fromParams) return fromParams;
    const send = url.pathname.match(/\/send\/(0x[a-fA-F0-9]{40})/i);
    if (send?.[1]) return checksum(send[1]);
    const caip = url.pathname.match(/eip155:\d+:(0x[a-fA-F0-9]{40})/i);
    if (caip?.[1]) return checksum(caip[1]);
    return pick(hexes(raw));
  } catch {
    return null;
  }
}

/** Pull an Ethereum address out of wallet QR payloads (EIP-681, MetaMask, Rabby, Binance, Tether, raw). */
export function parsePaymentAddress(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  const json = fromJson(text);
  if (json) return json;

  if (SCHEME.test(text) || /^pay-/i.test(text)) {
    const fromScheme = fromEip681(text);
    if (fromScheme) return fromScheme;
  }

  const caip = text.match(/eip155:\d+:(0x[a-fA-F0-9]{40})/i);
  if (caip?.[1]) return checksum(caip[1]);

  if (/^https?:\/\//i.test(text)) {
    const fromUrl = fromHttpUrl(text);
    if (fromUrl) return fromUrl;
  }

  const query = fromQuery(text);
  if (query && /(?:address|to|recipient|wallet)=/i.test(text)) return query;

  return pick(hexes(text));
}
