/** Convenience unlock: WebAuthn gate + PIN wrap on this device. Seed still needs PIN for crypto. */

export const BIO_STORAGE_KEY = "walinox.bio.v1";

type BioBlob = {
  v: 1;
  credId: string;
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

async function wrapKey(salt: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", salt as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export function biometricSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;
  return true;
}

export async function platformAuthenticatorAvailable(): Promise<boolean> {
  if (!biometricSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function biometricEnabled(): boolean {
  if (typeof localStorage === "undefined") return false;
  return Boolean(localStorage.getItem(BIO_STORAGE_KEY));
}

export function disableBiometric(): void {
  localStorage.removeItem(BIO_STORAGE_KEY);
}

export async function enableBiometric(pin: string): Promise<void> {
  if (pin.length < 6) throw new Error("PIN inválido");
  if (!(await platformAuthenticatorAvailable())) {
    throw new Error("Este dispositivo no tiene biometría disponible");
  }

  const challenge = randomBytes(32);
  const userId = randomBytes(16);
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge as BufferSource,
      rp: { name: "Walinox", id: window.location.hostname },
      user: {
        id: userId as BufferSource,
        name: "walinox-local",
        displayName: "Walinox",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("No se pudo registrar biometría");

  const salt = randomBytes(32);
  const iv = randomBytes(12);
  const key = await wrapKey(salt);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(pin),
  );

  const blob: BioBlob = {
    v: 1,
    credId: b64(credential.rawId),
    salt: b64(salt),
    iv: b64(iv),
    data: b64(cipher),
  };
  localStorage.setItem(BIO_STORAGE_KEY, JSON.stringify(blob));
}

export async function unlockWithBiometric(): Promise<string> {
  const raw = localStorage.getItem(BIO_STORAGE_KEY);
  if (!raw) throw new Error("Biometría no activada");
  let blob: BioBlob;
  try {
    blob = JSON.parse(raw) as BioBlob;
  } catch {
    throw new Error("Datos biométricos corruptos");
  }
  if (blob.v !== 1 || !blob.credId || !blob.salt || !blob.iv || !blob.data) {
    throw new Error("Datos biométricos inválidos");
  }

  const challenge = randomBytes(32);
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: challenge as BufferSource,
      rpId: window.location.hostname,
      allowCredentials: [
        {
          type: "public-key",
          id: fromB64(blob.credId) as BufferSource,
          transports: ["internal"],
        },
      ],
      userVerification: "required",
      timeout: 60_000,
    },
  });
  if (!assertion) throw new Error("Biometría cancelada");

  const key = await wrapKey(fromB64(blob.salt));
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(blob.iv) as BufferSource },
      key,
      fromB64(blob.data) as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    disableBiometric();
    throw new Error("No se pudo recuperar el PIN. Activá biometría de nuevo.");
  }
}
