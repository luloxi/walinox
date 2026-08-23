"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { isAddress } from "ethers";
import { ConnectCta } from "@/components/connect-cta";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AddressInput } from "@/components/address-input";
import { ContactPicker } from "@/components/contact-picker";
import { QvacHint } from "@/components/qvac-hint";
import { BackLink } from "@/components/back-link";
import { Price } from "@/components/price";
import { categoryLabel } from "@/lib/categories";
import { EtherscanTxLink } from "@/components/etherscan-link";
import { usePaymentChain } from "@/components/use-payment-chain";
import { useWallet } from "@/components/wallet-provider";
import { toBaseUnits } from "@/lib/agent";
import { bumpSold, getProduct, holdVale, issueVale, listProducts } from "@/lib/catalog";
import { rememberContact } from "@/lib/contacts";
import { isLocalHost } from "@/lib/dev";
import { parsePaymentAddress } from "@/lib/payment-address";
import { payloadToDataUrl } from "@/lib/qr";
import { notifyPeer } from "@/lib/notify";
import { receiptFromPermit } from "@/lib/receipts";
import { USDT } from "@/lib/tokens";
import {
  createSignedVale,
  isDemoProduct,
  type Product,
  type ValeEnvelope,
} from "@/lib/vale";

export function ProductDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { wallet, ready } = useWallet();
  const { ensure } = usePaymentChain();
  const rawId = params.id ?? "";
  const id = (() => {
    try {
      return decodeURIComponent(rawId);
    } catch {
      return rawId;
    }
  })();
  const [product, setProduct] = useState<Product | undefined>();
  const [looked, setLooked] = useState(false);
  const [holder, setHolder] = useState("");
  const [valeQr, setValeQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [bought, setBought] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    const found =
      getProduct(id) ??
      getProduct(rawId) ??
      listProducts().find((item) => item.id === id || item.id === rawId);
    setProduct(found);
    setLooked(true);
  }, [id, rawId]);

  if (!looked) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }
  if (!product) {
    return <p className="text-sm text-muted-foreground">No está este producto.</p>;
  }

  const listing = product;
  const isSeller = wallet?.address.toLowerCase() === listing.issuer.toLowerCase();
  const remaining = listing.supply - listing.sold;
  const demo = isDemoProduct(listing) || isLocalHost();

  async function mint(holderAddress: string, paymentTx?: string, asDemo = false) {
    if (!wallet) throw new Error("Conectá una wallet");
    const envelope = await createSignedVale({
      sign: (typed) => wallet.signTypedData(typed),
      product: listing,
      issuer: asDemo ? wallet.address : listing.issuer,
      holder: holderAddress,
      paymentTx,
      demo: asDemo,
    });
    bumpSold(listing.id);
    issueVale(envelope);
    if (holderAddress.toLowerCase() === wallet.address.toLowerCase()) {
      holdVale(envelope);
    }
    setValeQr(await payloadToDataUrl(JSON.stringify(envelope)));
    return envelope;
  }

  async function buy() {
    if (!wallet) return;
    setBusy(true);
    setError(null);
    try {
      let tx: string | undefined;
      if (!demo) {
        await ensure();
        const value = toBaseUnits(listing.price, USDT.decimals);
        tx = await wallet.transfer(USDT.address, listing.issuer, value);
        setHash(tx);
        receiptFromPermit(
          { owner: wallet.address, spender: listing.issuer, value, token: USDT.symbol },
          { action: "sent", channel: "online", signature: tx, valid: true },
        );
        void notifyPeer({
          kind: "usdt",
          from: wallet.address,
          to: listing.issuer,
          amount: listing.price,
          token: "USDT",
        });
      }
      rememberContact(listing.issuer, { name: listing.issuerName });
      if (demo) {
        await mint(wallet.address, tx, true);
        setBought(true);
      } else {
        setPaid(true);
      }
      setProduct(getProduct(listing.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo comprar");
    } finally {
      setBusy(false);
    }
  }

  async function give() {
    if (!wallet) return;
    const to = parsePaymentAddress(holder) ?? (isAddress(holder) ? holder : null);
    if (!to) {
      setError("Poné a quién se lo das");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const envelope = await mint(to, hash ?? undefined, false);
      rememberContact(to);
      receiptFromPermit(
        { owner: wallet.address, spender: to, value: envelope.price, token: "VALE" },
        { action: "issued", channel: "qr", signature: envelope.signature, valid: true },
      );
      void notifyPeer({
        kind: "vale",
        from: wallet.address,
        to,
        amount: listing.price,
        token: "USDT",
        url: "/tienda",
      });
      setProduct(getProduct(listing.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo armar el vale");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg pb-6">
      <BackLink
        href="/tienda"
        className={`mb-3 -ml-1 ${ready ? "hidden md:inline-flex" : ""}`}
      >
        Tienda
      </BackLink>
      <p className="mt-3 text-lg font-semibold leading-tight">{product.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {categoryLabel(product.category)} · {product.issuerName}
        {product.redemptionPlace ? ` · Retiro: ${product.redemptionPlace}` : ""}
      </p>
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image} alt="" className="mt-4 h-40 w-full rounded-2xl object-cover" />
      ) : null}
      <div className="mt-4">
        <Price usdt={product.price} size="lg" />
      </div>

      {paid && !bought ? (
        <p className="mt-6 text-sm text-primary">Pagaste. En el local te dan el vale.</p>
      ) : null}
      {bought ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-primary">Listo. Ese vale es tuyo.</p>
          {valeQr ? (
            <div className="overflow-hidden rounded-2xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={valeQr} alt="Tu vale" className="mx-auto h-52 w-52" />
            </div>
          ) : null}
          <Button type="button" className="h-12 w-full" onClick={() => router.push("/tienda")}>
            Volver a tienda
          </Button>
        </div>
      ) : isSeller ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm">Darle el vale a</p>
          {wallet ? (
            <QvacHint
              task="contact"
              owner={wallet.address}
              placeholder="el vale es para 0x… o lulox.eth"
              onFill={(intent) => {
                if (intent.to) setHolder(intent.to);
              }}
            />
          ) : null}
          <ContactPicker selected={holder} onPick={(contact) => setHolder(contact.address)} />
          <AddressInput value={holder} onChange={setHolder} placeholder="Address del cliente" />
          <Button
            type="button"
            className="h-12 w-full"
            disabled={!wallet || busy || remaining <= 0}
            onClick={() => void give()}
          >
            {busy ? "Armando…" : "Dar vale"}
          </Button>
          {valeQr ? (
            <div className="overflow-hidden rounded-2xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={valeQr} alt="Vale" className="mx-auto h-44 w-44" />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {!wallet ? (
            <>
              <p className="text-sm text-muted-foreground">Conectá tu billetera para comprar.</p>
              <ConnectCta stacked label="Iniciar sesión para comprar" />
            </>
          ) : (
            <Button
              type="button"
              className="h-12 w-full text-base"
              disabled={busy || remaining <= 0}
              onClick={() => void buy()}
            >
              {busy ? "Comprando…" : "Comprar"}
            </Button>
          )}
        </div>
      )}

      {hash ? (
        <div className="mt-3">
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
