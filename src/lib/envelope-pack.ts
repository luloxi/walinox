import { getAddress } from "ethers";
import { buildPermit } from "@/lib/permit";
import { buildPermit2 } from "@/lib/permit2";
import type { SignedEnvelope } from "@/lib/payload";

export const COMPACT_QR_PREFIX = "W1:";

function hexToBytes(hex: string, length: number): Uint8Array {
  const clean = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  const out = new Uint8Array(length);
  const n = Math.min(length, Math.floor(clean.length / 2));
  for (let i = 0; i < n; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(data: Uint8Array): string {
  return `0x${Array.from(data, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function addrToBytes(value: string): Uint8Array {
  return hexToBytes(getAddress(value), 20);
}

function bytesToAddr(data: Uint8Array): string {
  return getAddress(bytesToHex(data));
}

function u256ToBytes(value: string): Uint8Array {
  let n = BigInt(value);
  if (n < BigInt(0)) throw new Error("negative");
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(n & BigInt(0xff));
    n >>= BigInt(8);
  }
  if (n !== BigInt(0)) throw new Error("uint256 overflow");
  return out;
}

function bytesToU256(data: Uint8Array): string {
  let n = BigInt(0);
  for (const b of data) n = (n << BigInt(8)) | BigInt(b);
  return n.toString();
}

function bytesToB64(data: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(data).toString("base64");
  let s = "";
  for (const b of data) s += String.fromCharCode(b);
  return btoa(s);
}

function bytesToB64Url(data: Uint8Array): string {
  return bytesToB64(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64ToBytes(b64: string): Uint8Array {
  const normalized = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.length % 4 === 0 ? normalized : normalized + "=".repeat(4 - (normalized.length % 4));
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(padded, "base64"));
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function packEnvelope(envelope: SignedEnvelope): Uint8Array {
  const out = new Uint8Array(207);
  out[0] = envelope.kind === "permit2" ? 0 : 1;
  out.set(addrToBytes(envelope.owner), 1);
  out.set(addrToBytes(envelope.spender), 21);
  out.set(addrToBytes(envelope.token), 41);
  out.set(u256ToBytes(envelope.value), 61);
  out.set(u256ToBytes(String(envelope.typedData.message.nonce ?? "0")), 93);
  const deadline = BigInt(String(envelope.typedData.message.deadline ?? "0"));
  for (let i = 7; i >= 0; i--) {
    out[125 + i] = Number((deadline >> BigInt((7 - i) * 8)) & BigInt(0xff));
  }
  const chainId = envelope.typedData.domain.chainId;
  out[133] = (chainId >>> 24) & 0xff;
  out[134] = (chainId >>> 16) & 0xff;
  out[135] = (chainId >>> 8) & 0xff;
  out[136] = chainId & 0xff;
  const sig = hexToBytes(envelope.signature, 65);
  if (sig[64] < 27) sig[64] += 27;
  out.set(sig, 137);
  return out;
}

export function unpackEnvelope(data: Uint8Array): SignedEnvelope {
  if (data.length < 207) throw new Error("Sobre aéreo corto");
  const kind = data[0] === 0 ? "permit2" : "erc2612";
  const owner = bytesToAddr(data.slice(1, 21));
  const spender = bytesToAddr(data.slice(21, 41));
  const token = bytesToAddr(data.slice(41, 61));
  const value = bytesToU256(data.slice(61, 93));
  const nonce = bytesToU256(data.slice(93, 125));
  let deadlineN = BigInt(0);
  for (let i = 0; i < 8; i++) deadlineN = (deadlineN << BigInt(8)) | BigInt(data[125 + i]);
  const deadline = deadlineN.toString();
  const chainId =
    ((data[133] << 24) | (data[134] << 16) | (data[135] << 8) | data[136]) >>> 0;
  const sigBytes = data.slice(137, 202);
  if (sigBytes[64] < 27) sigBytes[64] += 27;
  const signature = bytesToHex(sigBytes);
  if (kind === "permit2") {
    const typed = buildPermit2({ token, spender, amount: value, nonce, deadline, chainId });
    return {
      v: 1,
      kind,
      owner,
      spender: typed.message.spender,
      token: typed.message.permitted.token,
      value: typed.message.permitted.amount,
      typedData: {
        domain: typed.domain,
        types: typed.types,
        primaryType: typed.primaryType,
        message: typed.message as unknown as Record<string, unknown>,
      },
      signature,
    };
  }
  const typed = buildPermit({
    domain: { name: "Tether USD", version: "1", chainId, verifyingContract: token },
    owner,
    spender,
    value,
    nonce,
    deadline,
  });
  return {
    v: 1,
    kind,
    owner: typed.message.owner,
    spender: typed.message.spender,
    token: typed.domain.verifyingContract,
    value: typed.message.value,
    typedData: {
      domain: typed.domain,
      types: typed.types,
      primaryType: typed.primaryType,
      message: typed.message,
    },
    signature,
  };
}

export function encodeEnvelopeQr(envelope: SignedEnvelope): string {
  return `${COMPACT_QR_PREFIX}${bytesToB64Url(packEnvelope(envelope))}`;
}

export function tryDecodeCompactQr(raw: string): SignedEnvelope | null {
  const idx = raw.indexOf(COMPACT_QR_PREFIX);
  if (idx < 0) return null;
  const rest = raw
    .slice(idx + COMPACT_QR_PREFIX.length)
    .replace(/[\n\r\t]/g, "")
    .replace(/ /g, "+");
  try {
    return unpackEnvelope(b64ToBytes(rest));
  } catch {
    return null;
  }
}
