import {
  TypedDataEncoder,
  getAddress,
  isAddress,
  keccak256,
  toUtf8Bytes,
  verifyTypedData,
} from "ethers";
import type { Eip712Domain } from "@/lib/permit";
import { USDT } from "@/lib/tokens";
import { toBaseUnits } from "@/lib/agent";

export const VALE_PRIMARY = "Vale" as const;

export const VALE_TYPES = {
  Vale: [
    { name: "tokenId", type: "uint256" },
    { name: "productId", type: "bytes32" },
    { name: "title", type: "string" },
    { name: "issuer", type: "address" },
    { name: "holder", type: "address" },
    { name: "price", type: "uint256" },
    { name: "expires", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "termsHash", type: "bytes32" },
  ],
};

export const DEFAULT_TERMS =
  "Vale de un producto físico. Se retira en el local. No es una inversión.";

export const COMPLIANCE_LINES = [
  "Este NFT es un vale de compra de un bien o servicio físico, no un instrumento financiero ni una inversión.",
  "El emisor se obliga a entregar el bien al portador del vale vigente y no canjeado.",
  "El canje queda registrado (quién, cuándo, tokenId) para trazabilidad comercial.",
  "Lugar, plazo y condiciones de canje están informados en el vale.",
] as const;

export type ValeMessage = {
  tokenId: string;
  productId: string;
  title: string;
  issuer: string;
  holder: string;
  price: string;
  expires: string;
  nonce: string;
  termsHash: string;
};

export type ValeTypedData = {
  domain: Eip712Domain;
  types: typeof VALE_TYPES;
  primaryType: typeof VALE_PRIMARY;
  message: ValeMessage;
};

export type Product = {
  id: string;
  storeId?: string;
  title: string;
  description: string;
  image?: string;
  price: string;
  supply: number;
  sold: number;
  terms: string;
  issuerName: string;
  redemptionPlace: string;
  expiresAt?: string;
  issuer: string;
  createdAt: string;
  category?: string;
};

export type ValeEnvelope = {
  v: 1;
  kind: "vale";
  tokenId: string;
  productId: string;
  issuer: string;
  holder: string;
  title: string;
  price: string;
  expires: string;
  terms: string;
  termsHash: string;
  issuerName: string;
  redemptionPlace: string;
  image?: string;
  paymentTx?: string;
  typedData: ValeTypedData;
  signature: string;
  demo?: boolean;
};

export type RedeemRecord = {
  tokenId: string;
  issuer: string;
  holder: string;
  at: string;
  note: string;
};

export function hashTerms(terms: string): string {
  return keccak256(toUtf8Bytes(terms.trim()));
}

export function productIdFor(issuer: string, title: string, createdAt: string): string {
  return keccak256(toUtf8Bytes(`${getAddress(issuer)}:${title.trim()}:${createdAt}`));
}

export function valeDomain(issuer: string): Eip712Domain {
  return {
    name: "Walinox Vale",
    version: "1",
    chainId: 1,
    verifyingContract: getAddress(issuer),
  };
}

export function buildVale(input: {
  tokenId: string;
  productId: string;
  title: string;
  issuer: string;
  holder: string;
  price: string;
  expires?: string;
  nonce?: string;
  terms: string;
}): ValeTypedData {
  if (!isAddress(input.issuer) || !isAddress(input.holder)) {
    throw new Error("Issuer y holder tienen que ser addresses");
  }
  return {
    domain: valeDomain(input.issuer),
    types: VALE_TYPES,
    primaryType: VALE_PRIMARY,
    message: {
      tokenId: input.tokenId,
      productId: input.productId,
      title: input.title.trim(),
      issuer: getAddress(input.issuer),
      holder: getAddress(input.holder),
      price: input.price,
      expires: input.expires ?? "0",
      nonce: input.nonce ?? String(Date.now()),
      termsHash: hashTerms(input.terms),
    },
  };
}

export function hashVale(typed: ValeTypedData): string {
  return TypedDataEncoder.hash(typed.domain, typed.types, typed.message);
}

export function recoverValeSigner(typed: ValeTypedData, signature: string): string {
  return getAddress(verifyTypedData(typed.domain, typed.types, typed.message, signature));
}

export function validateVale(
  envelope: ValeEnvelope,
):
  | { ok: true; recovered: string; digest: string }
  | { ok: false; reason: string; recovered?: string; digest?: string } {
  try {
    if (envelope.kind !== "vale") return { ok: false, reason: "No es un vale" };
    if (hashTerms(envelope.terms) !== envelope.termsHash) {
      return { ok: false, reason: "Los términos no coinciden con la firma" };
    }
    const digest = hashVale(envelope.typedData);
    const recovered = recoverValeSigner(envelope.typedData, envelope.signature);
    if (recovered !== getAddress(envelope.issuer)) {
      return { ok: false, reason: "La firma no es del emisor", recovered, digest };
    }
    const expires = Number(envelope.expires);
    if (expires > 0 && Date.now() / 1000 > expires) {
      return { ok: false, reason: "El vale está vencido", recovered, digest };
    }
    return { ok: true, recovered, digest };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Vale inválido" };
  }
}

export function isDemoProduct(product: { id: string }): boolean {
  return product.id.startsWith("mock:");
}

export async function createSignedVale(input: {
  sign: (typed: {
    domain: Eip712Domain;
    types: Record<string, { name: string; type: string }[]>;
    message: Record<string, unknown>;
  }) => Promise<string>;
  product: Product;
  issuer: string;
  holder: string;
  paymentTx?: string;
  demo?: boolean;
}): Promise<ValeEnvelope> {
  const typed = buildVale({
    tokenId: String(Date.now()),
    productId: input.product.id,
    title: input.product.title,
    issuer: input.issuer,
    holder: input.holder,
    price: priceToBase(input.product.price),
    expires: input.product.expiresAt ?? "0",
    terms: input.product.terms,
  });
  const signature = await input.sign({
    domain: typed.domain,
    types: typed.types,
    message: typed.message,
  });
  return {
    v: 1,
    kind: "vale",
    tokenId: typed.message.tokenId,
    productId: typed.message.productId,
    issuer: typed.message.issuer,
    holder: typed.message.holder,
    title: typed.message.title,
    price: typed.message.price,
    expires: typed.message.expires,
    terms: input.product.terms,
    termsHash: typed.message.termsHash,
    issuerName: input.product.issuerName,
    redemptionPlace: input.product.redemptionPlace,
    image: input.product.image,
    paymentTx: input.paymentTx,
    typedData: typed,
    signature,
    demo: input.demo,
  };
}

export function priceToBase(price: string): string {
  return toBaseUnits(price, USDT.decimals);
}

export function encodeVale(envelope: ValeEnvelope): string {
  return JSON.stringify(envelope);
}

export function decodeVale(raw: string): ValeEnvelope {
  const parsed = JSON.parse(raw.trim()) as ValeEnvelope;
  if (parsed?.kind !== "vale" || parsed.v !== 1) {
    throw new Error("No es un vale Walinox");
  }
  if (!parsed.signature?.startsWith("0x")) throw new Error("Vale sin firma");
  const typed = buildVale({
    tokenId: String(parsed.typedData.message.tokenId ?? parsed.tokenId),
    productId: String(parsed.typedData.message.productId ?? parsed.productId),
    title: String(parsed.typedData.message.title ?? parsed.title),
    issuer: String(parsed.typedData.message.issuer ?? parsed.issuer),
    holder: String(parsed.typedData.message.holder ?? parsed.holder),
    price: String(parsed.typedData.message.price ?? parsed.price),
    expires: String(parsed.typedData.message.expires ?? parsed.expires ?? "0"),
    nonce: String(parsed.typedData.message.nonce ?? ""),
    terms: String(parsed.terms ?? ""),
  });
  return {
    ...parsed,
    v: 1,
    kind: "vale",
    tokenId: typed.message.tokenId,
    productId: typed.message.productId,
    issuer: typed.message.issuer,
    holder: typed.message.holder,
    title: typed.message.title,
    price: typed.message.price,
    expires: typed.message.expires,
    termsHash: typed.message.termsHash,
    typedData: typed,
  };
}

export function nftMetadata(envelope: ValeEnvelope) {
  return {
    name: `Vale · ${envelope.title}`,
    description:
      "NFT vale de compra de un producto físico. La posesión de este token autoriza el canje ante el emisor, sujeto a los términos firmados.",
    image: envelope.image,
    attributes: [
      { trait_type: "Issuer", value: envelope.issuer },
      { trait_type: "Holder", value: envelope.holder },
      { trait_type: "Price", value: envelope.price },
      { trait_type: "Kind", value: "physical-voucher" },
      { trait_type: "Redemption", value: envelope.redemptionPlace },
    ],
  };
}
