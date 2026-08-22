"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { isAddress } from "ethers";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AddressInput } from "@/components/address-input";
import { ContactPicker } from "@/components/contact-picker";
import { Hint } from "@/components/hint";
import { SectionBar } from "@/components/section-bar";
import Link from "next/link";
import { UsdtLogo } from "@/components/usdt-logo";
import { EtherscanTxLink } from "@/components/etherscan-link";
import { useWallet } from "@/components/wallet-provider";
import { toBaseUnits } from "@/lib/agent";
import { bumpSold, getProduct, holdVale, issueVale } from "@/lib/catalog";
import { rememberContact } from "@/lib/contacts";
import { isLocalHost } from "@/lib/dev";
import { parsePaymentAddress } from "@/lib/payment-address";
import { payloadToDataUrl } from "@/lib/qr";
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
  const { wallet, connected } = useWallet();
  const id = decodeURIComponent(params.id ?? "");
  const [product, setProduct] = useState<Product | undefined>();
  const [holder, setHolder] = useState("");
  const [valeQr, setValeQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [bought, setBought] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    setProduct(getProduct(id));
  }, [id]);

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
        const value = toBaseUnits(listing.price, USDT.decimals);
        tx = await wallet.transfer(USDT.address, listing.issuer, value);
        setHash(tx);
        receiptFromPermit(
          { owner: wallet.address, spender: listing.issuer, value, token: USDT.symbol },
          { action: "sent", channel: "online", signature: tx, valid: true },
        );
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
      setProduct(getProduct(listing.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo armar el vale");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto pb-4">
      <SectionBar title={product.title} hint={`Retiro: ${product.redemptionPlace}`}>
        <Link href={`/tienda/${listing.storeId ?? listing.issuer.toLowerCase()}`} className="cursor-pointer text-xs text-teal-300">
          Volver
        </Link>
      </SectionBar>
      <p className="mt-2 text-xs text-muted-foreground">{product.issuerName}</p>
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image} alt="" className="mt-4 h-40 w-full rounded-2xl object-cover" />
      ) : null}
      <p className="mt-4 inline-flex items-center gap-2 text-3xl font-semibold">
        {product.price}
        <UsdtLogo className="size-7" />
      </p>

      {paid && !bought ? (
        <p className="mt-6 text-sm text-teal-300">Pagaste. En el local te dan el vale.</p>
      ) : null}
      {bought ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-teal-300">Listo. Ese vale es tuyo.</p>
          {valeQr ? (
            <div className="overflow-hidden rounded-2xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={valeQr} alt="Tu vale" className="mx-auto h-52 w-52" />
            </div>
          ) : null}
          <Button type="button" className="h-12 w-full" onClick={() => router.push("/tienda?tab=vales")}>
            Ver mis vales
          </Button>
        </div>
      ) : isSeller ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center">
            <span className="text-sm">Darle el vale a</span>
            <Hint text="El cliente ya pagó. Poné su address y se arma el vale." />
          </div>
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
          {!connected ? (
            <div className="[&_button]:cursor-pointer">
              <ConnectButton label="Conectar para comprar" />
            </div>
          ) : null}
          <Button
            type="button"
            className="h-12 w-full text-base"
            disabled={!wallet || busy || remaining <= 0}
            onClick={() => void buy()}
          >
            {busy ? "Comprando…" : "Comprar"}
          </Button>
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
