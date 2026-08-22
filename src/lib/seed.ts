import { getAddress, isAddress } from "ethers";
import { holdVale, issueVale, isRedeemed, listHeld, redeemVale, saveProduct } from "@/lib/catalog";
import { LULOX_ADDRESS, rememberContact } from "@/lib/contacts";
import { isLocalHost } from "@/lib/dev";
import { addInboxItem } from "@/lib/notify";
import { addReceipt } from "@/lib/receipts";
import { MOCK_PRODUCTS, MOCK_STORES } from "@/lib/stores";
import {
  buildVale,
  priceToBase,
  productIdFor,
  type Product,
  type ValeEnvelope,
} from "@/lib/vale";

export const LIVED_IN_KEY = "walinox.livedin.v1";

const MARU = "0x4444444444444444444444444444444444444444";
const NACHO = "0x5555555555555555555555555555555555555555";
const DEMO_SIG = `0x${"11".repeat(65)}`;

function livedInFlag(address: string): string {
  return `${LIVED_IN_KEY}.${address.toLowerCase()}`;
}

function productByTitle(title: string): Product {
  const found = MOCK_PRODUCTS.find((item) => item.title === title);
  if (!found) throw new Error(`Mock product missing: ${title}`);
  return found;
}

export function demoVale(product: Product, holder: string, tokenId: string): ValeEnvelope {
  const typed = buildVale({
    tokenId,
    productId: product.id,
    title: product.title,
    issuer: product.issuer,
    holder,
    price: priceToBase(product.price),
    terms: product.terms,
  });
  return {
    v: 1,
    kind: "vale",
    tokenId,
    productId: product.id,
    issuer: typed.message.issuer,
    holder: typed.message.holder,
    title: product.title,
    price: typed.message.price,
    expires: "0",
    terms: product.terms,
    termsHash: typed.message.termsHash,
    issuerName: product.issuerName,
    redemptionPlace: product.redemptionPlace,
    image: product.image,
    typedData: typed,
    signature: DEMO_SIG,
    demo: true,
  };
}

export function myStoreProducts(issuer: string): Product[] {
  const checksum = getAddress(issuer);
  return MOCK_PRODUCTS.filter((item) => item.storeId === "local-lulox").map((item) => ({
    ...item,
    id: productIdFor(checksum, item.title, item.createdAt),
    storeId: checksum.toLowerCase(),
    issuer: checksum,
    issuerName: "Mi local",
  }));
}

export function seedLivedIn(address?: string): void {
  if (!isLocalHost() || typeof localStorage === "undefined") return;
  if (!address || !isAddress(address)) return;
  const me = getAddress(address);
  const flag = livedInFlag(me);
  if (localStorage.getItem(flag) === "1") return;

  const actingAsLulox = me.toLowerCase() === LULOX_ADDRESS.toLowerCase();
  const mine = actingAsLulox ? [] : myStoreProducts(me);
  for (const product of mine) saveProduct(product);

  const cafe = productByTitle("Café de especialidad 250g");
  const pan = productByTitle("Pan de masa madre");
  const miel = productByTitle("Miel 500g");
  const tostado = productByTitle("Tostado de barrio 250g");
  const facturas = productByTitle("Facturas del sábado");
  const yerba = productByTitle("Yerba mate 500g");

  const sellerTostado = actingAsLulox ? tostado : mine[0] ?? tostado;
  const sellerFacturas = actingAsLulox ? facturas : mine[1] ?? facturas;
  const sellerYerba = actingAsLulox ? yerba : mine[2] ?? yerba;

  const heldCafe = demoVale(cafe, me, `seed:vale:cafe:${me.toLowerCase()}`);
  const heldPan = demoVale(pan, me, `seed:vale:pan:${me.toLowerCase()}`);
  const usedMiel = demoVale(miel, me, `seed:vale:miel:${me.toLowerCase()}`);
  const soldTostado = demoVale(sellerTostado, MARU, `seed:vale:sold-cafe:${me.toLowerCase()}`);
  const soldFacturas = demoVale(sellerFacturas, NACHO, `seed:vale:sold-facturas:${me.toLowerCase()}`);
  const soldYerba = demoVale(sellerYerba, MARU, `seed:vale:sold-yerba:${me.toLowerCase()}`);

  const knownHeld = new Set(listHeld().map((item) => item.tokenId));
  for (const envelope of [heldCafe, heldPan]) {
    if (!knownHeld.has(envelope.tokenId)) holdVale(envelope);
  }
  issueVale(soldTostado);
  issueVale(soldFacturas);
  issueVale(soldYerba);
  if (!isRedeemed(usedMiel.tokenId, usedMiel.issuer)) redeemVale(usedMiel, "Retirado");
  if (!isRedeemed(soldFacturas.tokenId, soldFacturas.issuer)) redeemVale(soldFacturas, "Entregado");

  const tag = me.slice(2, 8).toLowerCase();
  addReceipt({
    id: `seed:rx:buy-cafe:${tag}`,
    at: "2026-03-14T11:20:00.000Z",
    action: "sent",
    channel: "online",
    owner: me,
    spender: cafe.issuer,
    value: cafe.price,
    token: "USDT",
    signature: "0xcafe01",
    valid: true,
  });
  addReceipt({
    id: `seed:rx:buy-pan:${tag}`,
    at: "2026-07-08T09:40:00.000Z",
    action: "sent",
    channel: "online",
    owner: me,
    spender: pan.issuer,
    value: pan.price,
    token: "USDT",
    signature: "0xpan01",
    valid: true,
  });
  addReceipt({
    id: `seed:rx:buy-miel:${tag}`,
    at: "2026-08-04T16:10:00.000Z",
    action: "sent",
    channel: "qr",
    owner: me,
    spender: miel.issuer,
    value: miel.price,
    token: "USDT",
    signature: "0xmiel01",
    valid: true,
  });
  addReceipt({
    id: `seed:rx:redeem-miel:${tag}`,
    at: "2026-08-05T10:05:00.000Z",
    action: "redeemed",
    channel: "qr",
    owner: miel.issuer,
    spender: me,
    value: miel.price,
    token: "VALE",
    signature: usedMiel.signature,
    valid: true,
  });
  addReceipt({
    id: `seed:rx:from-nacho:${tag}`,
    at: "2026-04-03T19:12:00.000Z",
    action: "received",
    channel: "online",
    owner: NACHO,
    spender: me,
    value: "40",
    token: "USDT",
    signature: "0xnacho01",
    valid: true,
  });
  addReceipt({
    id: `seed:rx:to-nacho:${tag}`,
    at: "2026-06-21T21:04:00.000Z",
    action: "sent",
    channel: "online",
    owner: me,
    spender: NACHO,
    value: "15",
    token: "USDT",
    signature: "0xnacho02",
    valid: true,
  });
  addReceipt({
    id: `seed:rx:sale-cafe:${tag}`,
    at: "2026-05-18T13:30:00.000Z",
    action: "sent",
    channel: "online",
    owner: MARU,
    spender: me,
    value: sellerTostado.price,
    token: "USDT",
    signature: "0xsale01",
    valid: true,
  });
  addReceipt({
    id: `seed:rx:issue-cafe:${tag}`,
    at: "2026-05-18T13:31:00.000Z",
    action: "issued",
    channel: "qr",
    owner: me,
    spender: MARU,
    value: priceToBase(sellerTostado.price),
    token: "VALE",
    signature: soldTostado.signature,
    valid: true,
  });
  addReceipt({
    id: `seed:rx:sale-facturas:${tag}`,
    at: "2026-07-19T10:00:00.000Z",
    action: "sent",
    channel: "online",
    owner: NACHO,
    spender: me,
    value: sellerFacturas.price,
    token: "USDT",
    signature: "0xsale02",
    valid: true,
  });
  addReceipt({
    id: `seed:rx:issue-facturas:${tag}`,
    at: "2026-07-19T10:01:00.000Z",
    action: "issued",
    channel: "qr",
    owner: me,
    spender: NACHO,
    value: priceToBase(sellerFacturas.price),
    token: "VALE",
    signature: soldFacturas.signature,
    valid: true,
  });
  addReceipt({
    id: `seed:rx:redeem-facturas:${tag}`,
    at: "2026-07-20T18:22:00.000Z",
    action: "redeemed",
    channel: "qr",
    owner: me,
    spender: NACHO,
    value: sellerFacturas.price,
    token: "VALE",
    signature: soldFacturas.signature,
    valid: true,
  });
  addReceipt({
    id: `seed:rx:sale-yerba:${tag}`,
    at: "2026-08-12T11:45:00.000Z",
    action: "sent",
    channel: "online",
    owner: MARU,
    spender: me,
    value: sellerYerba.price,
    token: "USDT",
    signature: "0xsale03",
    valid: true,
  });
  addReceipt({
    id: `seed:rx:issue-yerba:${tag}`,
    at: "2026-08-12T11:46:00.000Z",
    action: "issued",
    channel: "qr",
    owner: me,
    spender: MARU,
    value: priceToBase(sellerYerba.price),
    token: "VALE",
    signature: soldYerba.signature,
    valid: true,
  });

  addInboxItem({
    id: `seed:inbox:usdt:${tag}`,
    kind: "usdt",
    title: "Te mandaron USDT",
    body: "Nacho te envió 40 USDT",
    url: "/",
    from: NACHO,
    to: me,
    amount: "40",
    token: "USDT",
    at: "2026-04-03T19:12:00.000Z",
    read: true,
  });
  addInboxItem({
    id: `seed:inbox:sale:${tag}`,
    kind: "usdt",
    title: "Te compraron",
    body: "Maru te pagó un Tostado de barrio 250g",
    url: "/tienda?tab=vendedor",
    from: MARU,
    to: me,
    amount: sellerTostado.price,
    token: "USDT",
    at: "2026-05-18T13:30:00.000Z",
    read: true,
  });
  addInboxItem({
    id: `seed:inbox:vale:${tag}`,
    kind: "vale",
    title: "Te dieron un vale",
    body: "Tostaduría Sur te dejó un vale de Café de especialidad 250g",
    url: "/tienda",
    from: cafe.issuer,
    to: me,
    amount: cafe.price,
    token: "USDT",
    at: "2026-03-14T11:21:00.000Z",
    read: true,
  });
  addInboxItem({
    id: `seed:inbox:redeem:${tag}`,
    kind: "redeemed",
    title: "Canjearon un vale",
    body: "Nacho canjeó Facturas del sábado",
    url: "/tienda?tab=vendedor",
    from: NACHO,
    to: me,
    amount: sellerFacturas.price,
    token: "USDT",
    at: "2026-07-20T18:22:00.000Z",
    read: false,
  });

  for (const store of MOCK_STORES) {
    if (store.issuer.toLowerCase() === me.toLowerCase()) continue;
    rememberContact(store.issuer, {
      name: store.name,
      createdAt: "2026-02-01T10:00:00.000Z",
      lastSeenAt: store.id === "panaderia-luna" ? "2026-07-08T09:40:00.000Z" : "2026-08-04T16:10:00.000Z",
    });
  }
  if (me.toLowerCase() !== LULOX_ADDRESS.toLowerCase()) {
    rememberContact(LULOX_ADDRESS, {
      name: "lulox.eth",
      createdAt: "2026-02-01T10:00:00.000Z",
      lastSeenAt: "2026-08-12T11:46:00.000Z",
    });
  }
  rememberContact(MARU, {
    name: "Maru",
    createdAt: "2026-05-01T10:00:00.000Z",
    lastSeenAt: "2026-08-12T11:46:00.000Z",
  });
  rememberContact(NACHO, {
    name: "Nacho",
    createdAt: "2026-04-01T10:00:00.000Z",
    lastSeenAt: "2026-07-20T18:22:00.000Z",
  });

  localStorage.setItem(flag, "1");
}
