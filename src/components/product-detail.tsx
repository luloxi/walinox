"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { isAddress } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ContactPicker } from "@/components/contact-picker";
import { UsdtLogo } from "@/components/usdt-logo";
import { EtherscanTxLink } from "@/components/etherscan-link";
import { useWallet } from "@/components/wallet-provider";
import { toBaseUnits } from "@/lib/agent";
import { bumpSold, encodeProduct, getProduct, issueVale } from "@/lib/catalog";
import { rememberContact } from "@/lib/contacts";
import { parsePaymentAddress } from "@/lib/payment-address";
import { payloadToDataUrl } from "@/lib/qr";
import { receiptFromPermit } from "@/lib/receipts";
import { USDT } from "@/lib/tokens";
import { buildVale, encodeVale, type Product, type ValeEnvelope } from "@/lib/vale";

export function ProductDetail() {
  const params = useParams<{ id: string }>();
  const { wallet } = useWallet();
  const id = decodeURIComponent(params.id ?? "");
  const [product, setProduct] = useState<Product | undefined>();
  const [shareQr, setShareQr] = useState<string | null>(null);
  const [holder, setHolder] = useState("");
  const [valeQr, setValeQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  useEffect(() => {
    const found = getProduct(id);
    setProduct(found);
    if (found) void payloadToDataUrl(encodeProduct(found)).then(setShareQr);
  }, [id]);

  if (!product) {
    return <p className="text-sm text-muted-foreground">Producto no encontrado en este dispositivo.</p>;
  }

  const listing = product;
  const isIssuer = wallet?.address.toLowerCase() === listing.issuer.toLowerCase();
  const remaining = listing.supply - listing.sold;

  async function pay() {
    if (!wallet) return;
    setBusy(true);
    setError(null);
    try {
      const value = toBaseUnits(listing.price, USDT.decimals);
      const tx = await wallet.transfer(USDT.address, listing.issuer, value);
      setHash(tx);
      rememberContact(listing.issuer, { name: listing.issuerName });
      receiptFromPermit(
        { owner: wallet.address, spender: listing.issuer, value, token: USDT.symbol },
        { action: "sent", channel: "online", signature: tx, valid: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pagar");
    } finally {
      setBusy(false);
    }
  }

  async function issue() {
    if (!wallet) return;
    const to = parsePaymentAddress(holder) ?? (isAddress(holder) ? holder : null);
    if (!to) {
      setError("Holder inválido");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (listing.sold >= listing.supply) throw new Error("Sin stock");
      const typed = buildVale({
        tokenId: String(Date.now()),
        productId: listing.id,
        title: listing.title,
        issuer: wallet.address,
        holder: to,
        price: toBaseUnits(listing.price, USDT.decimals),
        expires: listing.expiresAt ?? "0",
        terms: listing.terms,
      });
      const signature = await wallet.signTypedData({
        domain: typed.domain,
        types: typed.types,
        message: typed.message,
      });
      const envelope: ValeEnvelope = {
        v: 1,
        kind: "vale",
        tokenId: typed.message.tokenId,
        productId: typed.message.productId,
        issuer: typed.message.issuer,
        holder: typed.message.holder,
        title: typed.message.title,
        price: typed.message.price,
        expires: typed.message.expires,
        terms: listing.terms,
        termsHash: typed.message.termsHash,
        issuerName: listing.issuerName,
        redemptionPlace: listing.redemptionPlace,
        image: listing.image,
        paymentTx: hash ?? undefined,
        typedData: typed,
        signature,
      };
      const next = bumpSold(listing.id);
      issueVale(envelope);
      rememberContact(to);
      receiptFromPermit(
        {
          owner: wallet.address,
          spender: to,
          value: typed.message.price,
          token: "VALE",
        },
        { action: "issued", channel: "qr", signature, valid: true },
      );
      setProduct(next);
      setValeQr(await payloadToDataUrl(encodeVale(envelope)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo emitir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto">
      <h2 className="text-lg font-semibold">{product.title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {product.issuerName} · canje en {product.redemptionPlace}
      </p>
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image} alt="" className="mt-4 h-40 w-full rounded-2xl object-cover" />
      ) : null}
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
      <p className="mt-3 inline-flex items-center gap-2 text-2xl font-semibold">
        {product.price}
        <UsdtLogo className="size-6" />
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {remaining} de {product.supply} disponibles
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{product.terms}</p>

      {shareQr ? (
        <div className="mt-4 overflow-hidden rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shareQr} alt="QR del producto" className="mx-auto h-44 w-44" />
        </div>
      ) : null}

      {!isIssuer ? (
        <div className="mt-4 space-y-2">
          <Button type="button" className="h-11 w-full" disabled={!wallet || busy} onClick={() => void pay()}>
            {busy ? "Pagando…" : "Pagar en USDT"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Después del pago, el comercio emite el NFT vale a tu address.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Emitir vale NFT</p>
          <ContactPicker selected={holder} onPick={(contact) => setHolder(contact.address)} />
          <Input
            value={holder}
            onChange={(event) => setHolder(event.target.value)}
            placeholder="Address del comprador"
            className="h-10 font-mono"
          />
          <Button
            type="button"
            className="h-11 w-full"
            disabled={!wallet || busy || remaining <= 0}
            onClick={() => void issue()}
          >
            {busy ? "Firmando…" : "Emitir NFT"}
          </Button>
        </div>
      )}

      {valeQr ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Mostrale este QR al comprador</p>
          <div className="overflow-hidden rounded-2xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={valeQr} alt="QR del vale" className="mx-auto h-44 w-44" />
          </div>
        </div>
      ) : null}

      {hash ? (
        <div className="mt-3 space-y-1">
          <p className="break-all font-mono text-[11px] text-muted-foreground">Tx {hash}</p>
          <EtherscanTxLink hash={hash} className="text-xs" />
        </div>
      ) : null}
      {error ? (
        <Alert className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
