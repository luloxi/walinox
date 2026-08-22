import { JsonRpcProvider, getAddress, isAddress } from "ethers";
import { RPC_URL } from "@/lib/balance";

let provider: JsonRpcProvider | null = null;

export function ensProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider(RPC_URL, 1, { staticNetwork: true });
  }
  return provider;
}

/** ENS (.eth) and Base names (name.base.eth), plus other ENS-style names. */
export function isEnsName(value: string): boolean {
  const name = value.trim().toLowerCase();
  if (!name || name.startsWith("0x") || !name.includes(".")) return false;
  if (name.startsWith(".") || name.endsWith(".") || name.includes("..")) return false;
  return /^[a-z0-9.-]+$/.test(name);
}

export async function resolveEns(value: string): Promise<string | null> {
  const text = value.trim();
  if (!text) return null;
  if (isAddress(text)) return getAddress(text);
  if (!isEnsName(text)) return null;
  try {
    const resolved = await ensProvider().resolveName(text);
    return resolved ? getAddress(resolved) : null;
  } catch {
    return null;
  }
}

export async function lookupEns(address: string): Promise<string | null> {
  if (!isAddress(address)) return null;
  try {
    return await ensProvider().lookupAddress(address);
  } catch {
    return null;
  }
}

export async function ensAvatar(nameOrAddress: string): Promise<string | null> {
  try {
    const name = isAddress(nameOrAddress) ? await lookupEns(nameOrAddress) : String(nameOrAddress).trim();
    if (!name) return null;
    return (await ensProvider().getAvatar(name)) ?? null;
  } catch {
    return null;
  }
}
