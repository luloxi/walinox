"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, PackageSearch } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionBar } from "@/components/section-bar";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionLabel } from "@/components/empty-state";
import { PayCharge } from "@/components/pay-charge";
import { PosView } from "@/components/pos-view";
import { StoreShare } from "@/components/store-share";
import { ProductBrowser } from "@/components/product-browser";
import { QrScanner } from "@/components/qr-scanner";
import { ProductFilters } from "@/components/product-filters";
import { ProductForm } from "@/components/product-form";
import { ValesView } from "@/components/vales-view";
import { RedeemView } from "@/components/redeem-view";
import { useWallet } from "@/components/wallet-provider";
import { Price } from "@/components/price";
import { browseProducts, categoryLabel, type ProductSort } from "@/lib/categories";
import { listProducts, listStores, productsByIssuer, removeProduct } from "@/lib/catalog";
import { decodeCharge, type ChargeRequest } from "@/lib/charge";
import { seedLivedIn } from "@/lib/seed";
import type { Store } from "@/lib/stores";
import type { Product } from "@/lib/vale";

/** Buyer tab is hidden in the app chrome. Keep the JSX; flip this to restore it. */
export const SHOW_STORE_BUYER = false;

function buyerTab(raw: string | null): "comprador" | "vendedor" {
  if (!SHOW_STORE_BUYER) return "vendedor";
  if (raw === "vender" || raw === "vendedor") return "vendedor";
  return "comprador";
}

export function TiendaView() {
  const router = useRouter();
  const search = useSearchParams();
  const { wallet } = useWallet();
  const tab = buyerTab(search.get("tab"));
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [mine, setMine] = useState<Product[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<ProductSort>("categoria");
  const [payScan, setPayScan] = useState(false);
  const [charge, setCharge] = useState<ChargeRequest | null>(null);

  function refresh() {
    seedLivedIn(wallet?.address);
    setProducts(listProducts());
    setStores(listStores());
    setMine(wallet ? productsByIssuer(wallet.address) : []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      seedLivedIn(wallet?.address);
      setProducts(listProducts());
      setStores(listStores());
      setMine(wallet ? productsByIssuer(wallet.address) : []);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [wallet?.address]);

  const mined = useMemo(
    () => browseProducts(mine, { query, category, sort }),
    [mine, query, category, sort],
  );

  function setTab(next: string) {
    router.replace(next === "comprador" ? "/tienda" : "/tienda?tab=vendedor");
  }

  return (
    <div className="flex w-full flex-col pb-6">
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-0">
        {SHOW_STORE_BUYER ? (
          <SectionBar>
            <TabsList>
              <TabsTrigger value="comprador" className="cursor-pointer">
                Comprador
              </TabsTrigger>
              <TabsTrigger value="vendedor" className="cursor-pointer">
                Vendedor
              </TabsTrigger>
            </TabsList>
          </SectionBar>
        ) : null}

        <TabsContent value="comprador" className="mt-4">
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-10">
            <ProductBrowser products={products} stores={stores} empty="No hay productos con eso" />
            <section className="space-y-5 lg:sticky lg:top-2">
              {charge ? (
                <PayCharge charge={charge} onBack={() => setCharge(null)} />
              ) : (
                <div>
                  <SectionLabel className="mb-2">Pagar en el local</SectionLabel>
                  <Button type="button" className="h-11 w-full" onClick={() => setPayScan((value) => !value)}>
                    {payScan ? "Cerrar cámara" : "Escanear pedido"}
                  </Button>
                  <QrScanner
                    active={payScan}
                    onResult={(text) => {
                      const next = decodeCharge(text);
                      if (!next) return;
                      setCharge(next);
                      setPayScan(false);
                    }}
                  />
                </div>
              )}
              <div>
                <SectionLabel className="mb-3">Tus vales</SectionLabel>
                <ValesView embedded />
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="vendedor" className="mt-4">
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-10">
            <div className="space-y-6 lg:sticky lg:top-2">
              <PosView products={mine} />
              <section>
                <SectionLabel className="mb-3">Escanear vale del cliente</SectionLabel>
                <RedeemView embedded />
              </section>

              {wallet ? <StoreShare storeId={wallet.address} /> : null}

              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <SectionLabel>Publicar</SectionLabel>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    onClick={() => setPublishing((value) => !value)}
                  >
                    {publishing ? "Cerrar" : "Nuevo producto"}
                  </Button>
                </div>
                {publishing ? (
                  <div className="rounded-2xl border border-border p-3">
                    <ProductForm
                      embedded
                      onPublished={() => {
                        setPublishing(false);
                        refresh();
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Publicá un producto para venderlo en tu local.</p>
                )}
              </section>
            </div>

            <section>
              <SectionLabel>Tu catálogo</SectionLabel>
              <p className="mt-1 mb-3 text-xs text-muted-foreground">
                Ordená y filtrá por categoría. Cada producto lleva su categoría al publicarlo.
              </p>
              {mine.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Todavía no publicaste nada"
                  body="Creá un producto y aparece acá para el POS y el link de la tienda."
                  action={
                    <Button type="button" className="h-11" onClick={() => setPublishing(true)}>
                      Nuevo producto
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  <ProductFilters
                    query={query}
                    onQuery={setQuery}
                    category={category}
                    onCategory={setCategory}
                    sort={sort}
                    onSort={setSort}
                  />
                  {mined.items.length === 0 ? (
                    <EmptyState
                      icon={PackageSearch}
                      title="No hay productos con eso"
                      body="Probá otra categoría o búsqueda."
                    />
                  ) : (
                    (mined.groups ?? [{ id: "all", label: "", products: mined.items }]).map((group) => (
                      <div key={group.id} className="space-y-2">
                        {group.label ? <SectionLabel>{group.label}</SectionLabel> : null}
                        <ul className="space-y-2">
                          {group.products.map((product) => (
                            <li
                              key={product.id}
                              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2"
                            >
                              <Link
                                href={`/products/${encodeURIComponent(product.id)}`}
                                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                              >
                                {product.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={product.image} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                                ) : (
                                  <span className="size-14 shrink-0 rounded-xl bg-muted" />
                                )}
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium">{product.title}</span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {categoryLabel(product.category)} · {product.sold}/{product.supply}
                                  </span>
                                  <span className="mt-0.5 block">
                                    <Price usdt={product.price} size="sm" />
                                  </span>
                                </span>
                              </Link>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 shrink-0 text-muted-foreground"
                                onClick={() => {
                                  if (!wallet) return;
                                  removeProduct(product.id, wallet.address);
                                  refresh();
                                }}
                              >
                                Quitar
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
