/** Pear/Hyperswarm-compatible rooms: 32-byte topics, no native deps (browser PWA). */
const INVITE_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";

function bytesToInvite(bytes: Uint8Array, length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += INVITE_ALPHABET[bytes[i % bytes.length]! % INVITE_ALPHABET.length]!;
  }
  return out;
}

async function sha256(input: string | Uint8Array): Promise<Uint8Array> {
  const data =
    typeof input === "string" ? new TextEncoder().encode(input) : Uint8Array.from(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

/** Short room code. Deterministic when seed is fixed (same envelope → same sala). */
export async function inviteFromSeed(seed: string): Promise<string> {
  const hash = await sha256(`walinox/pears/invite/v1/${seed}`);
  return bytesToInvite(hash, 8);
}

/** 32-byte topic — same size Hyperswarm.join expects. */
export async function topicFromInvite(invite: string): Promise<Uint8Array> {
  const normalized = invite.trim().toLowerCase();
  if (normalized.length < 4) throw new Error("Invite demasiado corto");
  return sha256(`walinox/pears/topic/v1/${normalized}`);
}

export function topicHex(topic: Uint8Array): string {
  return Array.from(topic, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type PearWrap = {
  pears: 1;
  invite: string;
  topic: string;
  body: string;
};

export function isPearWrap(value: unknown): value is PearWrap {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    o.pears === 1 &&
    typeof o.invite === "string" &&
    typeof o.topic === "string" &&
    typeof o.body === "string"
  );
}

/** Wrap a SignedEnvelope JSON for offline transfer with a Pear room. */
export async function wrapForPears(body: string, seed: string): Promise<string> {
  const invite = await inviteFromSeed(seed);
  const topic = await topicFromInvite(invite);
  const message: PearWrap = {
    pears: 1,
    invite,
    topic: topicHex(topic),
    body,
  };
  return JSON.stringify(message);
}

/** If the payload is a Pear wrap, return body + invite; otherwise treat as plain envelope JSON. */
export function unwrapPears(raw: string): { body: string; invite?: string; topic?: string } {
  const trimmed = raw.trim();
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isPearWrap(parsed)) {
      return { body: parsed.body, invite: parsed.invite, topic: parsed.topic };
    }
  } catch {
    /* plain envelope or air packet */
  }
  return { body: trimmed };
}
