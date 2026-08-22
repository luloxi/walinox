"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { ProductBrowser } from "@/components/product-browser";
import { StoreShare } from "@/components/store-share";
import { useWallet } from "@/components/wallet-provider";
import { getStore, productsByIssuer, productsByStore } from "@/lib/catalog";
import { getContact } from "@/lib/contacts";
import { isEnsName, resolveEns } from "@/lib/ens";
import { isAddress } from "ethers";
import { storeSlug } from "@/lib/store-link";
import type { Product } from "@/lib/vale";
import type { Store } from "@/lib/stores";

export function StoreView() {
  const params = useParams<{ id: string }>();
  const { wallet, ready } = useWallet();
  const id = decodeURIComponent(params.id ?? "");
  const [store, setStore] = useState<Store | undefined>();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        let key = id;
        if (isEnsName(id)) {
          const resolved = await resolveEns(id);
          if (resolved) key = resolved;
        }
        if (!live) return;
        const found = getStore(key) ?? getStore(id);
        const listed = productsByStore(key);
        const byIssuer = isAddress(key) ? productsByIssuer(key) : [];
        setStore(found);
        setProducts(listed.length > 0 ? listed : byIssuer);
      })();
    }, 0);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [id]);

  const issuer = store?.issuer ?? (isAddress(id) ? id : products[0]?.issuer);
  let contactName = "";
  try {
    if (issuer) contactName = getContact(issuer)?.name ?? "";
  } catch {
    contactName = "";
  }
  const name =
    (store?.name && store.name !== "Tienda" ? store.name : "") ||
    products[0]?.issuerName ||
    contactName ||
    (isEnsName(id) ? id : "Tienda");
  const shareId = store?.id ?? (issuer ? storeSlug(issuer) : id);
  const mine = Boolean(wallet && issuer && wallet.address.toLowerCase() === issuer.toLowerCase());

  return (
    <div className="flex w-full flex-col pb-6">
      {ready ? (
        <BackLink href="/tienda" className="mb-3 -ml-1 hidden md:inline-flex">
          Tienda
        </BackLink>
      ) : null}
      <p className="mt-3 text-lg font-semibold">{name}</p>
      {store?.place ? <p className="mt-1 text-xs text-muted-foreground">{store.place}</p> : null}
      {!ready ? (
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Podés mirar el catálogo sin cuenta. Para comprar, iniciá sesión.
        </p>
      ) : null}
      <div className="mt-4 max-w-lg">
        <StoreShare storeId={shareId} title={mine ? "Tu tienda online" : "Compartir esta tienda"} />
      </div>
      {mine ? (
        <Button asChild variant="outline" className="mt-3 h-11 max-w-lg">
          <Link href="/tienda?tab=vendedor">Publicar en esta tienda</Link>
        </Button>
      ) : null}
      <div className="mt-6">
        <ProductBrowser products={products} empty="Esta tienda todavía no tiene productos." />
      </div>
    </div>
  );
}
