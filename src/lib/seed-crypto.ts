/** Local seed vault: PIN → PBKDF2 → AES-GCM. Plaintext seed never stays on disk after migrate. */

export const SEED_PLAIN_KEY = "walinox.seed";
export const SEED_VAULT_KEY = "walinox.seed.v2";

const PBKDF2_ITERS = 310_000;

type VaultBlob = {
  v: 2;
  salt: string;
  iv: string;
  data: string;
};

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function hasVault(): boolean {
  if (typeof localStorage === "undefined") return false;
  return Boolean(localStorage.getItem(SEED_VAULT_KEY));
}

export function hasLegacyPlainSeed(): boolean {
  if (typeof localStorage === "undefined") return false;
  return Boolean(localStorage.getItem(SEED_PLAIN_KEY));
}

export function assertPin(pin: string): void {
  if (pin.length < 6) throw new Error("El PIN debe tener al menos 6 caracteres");
}

export async function encryptSeed(seedPhrase: string, pin: string): Promise<void> {
  assertPin(pin);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(pin, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(seedPhrase),
  );
  const blob: VaultBlob = {
    v: 2,
    salt: b64(salt),
    iv: b64(iv),
    data: b64(cipher),
  };
  localStorage.setItem(SEED_VAULT_KEY, JSON.stringify(blob));
  localStorage.removeItem(SEED_PLAIN_KEY);
}

export async function decryptSeed(pin: string): Promise<string> {
  assertPin(pin);
  const raw = localStorage.getItem(SEED_VAULT_KEY);
  if (!raw) throw new Error("No hay billetera local");
  let blob: VaultBlob;
  try {
    blob = JSON.parse(raw) as VaultBlob;
  } catch {
    throw new Error("Vault corrupto");
  }
  if (blob.v !== 2 || !blob.salt || !blob.iv || !blob.data) {
    throw new Error("Vault inválido");
  }
  const key = await deriveKey(pin, fromB64(blob.salt));
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(blob.iv) as BufferSource },
      key,
      fromB64(blob.data) as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new Error("PIN incorrecto");
  }
}

/** Migrate legacy plaintext seed into the vault, or create a new encrypted seed. */
export async function unlockOrCreateSeed(
  pin: string,
  createSeed: () => string,
): Promise<string> {
  assertPin(pin);
  if (hasVault()) return decryptSeed(pin);

  const legacy = typeof localStorage !== "undefined" ? localStorage.getItem(SEED_PLAIN_KEY) : null;
  const seed = legacy && legacy.trim() ? legacy.trim() : createSeed();
  await encryptSeed(seed, pin);
  return seed;
}
