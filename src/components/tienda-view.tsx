"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionBar } from "@/components/section-bar";
import { Button } from "@/components/ui/button";
import { ProductBrowser } from "@/components/product-browser";
import { ProductFilters } from "@/components/product-filters";
import { ProductForm } from "@/components/product-form";
import { ValesView } from "@/components/vales-view";
import { RedeemView } from "@/components/redeem-view";
import { useWallet } from "@/components/wallet-provider";
import { Price } from "@/components/price";
import { browseProducts, categoryLabel, type ProductSort } from "@/lib/categories";
import { listProducts, listStores, productsByIssuer, removeProduct } from "@/lib/catalog";
import { seedLivedIn } from "@/lib/seed";
import type { Store } from "@/lib/stores";
import type { Product } from "@/lib/vale";

function buyerTab(raw: string | null): "comprador" | "vendedor" {
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
        <SectionBar hint="Comprador: productos, locales y tus vales. Vendedor: primero escaneás el vale del cliente; abajo publicás.">
          <TabsList>
            <TabsTrigger value="comprador" className="cursor-pointer">
              Comprador
            </TabsTrigger>
            <TabsTrigger value="vendedor" className="cursor-pointer">
              Vendedor
            </TabsTrigger>
          </TabsList>
        </SectionBar>

        <TabsContent value="comprador" className="mt-4">
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-10">
            <ProductBrowser products={products} stores={stores} empty="No hay productos con eso." />
            <section className="lg:sticky lg:top-2">
              <p className="mb-3 text-sm font-medium">Tus vales</p>
              <ValesView embedded />
            </section>
          </div>
        </TabsContent>

        <TabsContent value="vendedor" className="mt-4">
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="space-y-6 lg:sticky lg:top-2">
          <section>
            <p className="mb-3 text-sm font-medium">Escanear vale del cliente</p>
            <RedeemView embedded />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Publicar</p>
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
            <p className="mb-3 text-sm font-medium">Publicados</p>
            {mine.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no publicaste nada.</p>
            ) : (
              <div className="space-y-3">
                <ProductFilters
                  query={query}
                  onQuery={setQuery}
                  category={category}
                  onCategory={setCategory}
                  sort={sort}
                  onSort={setSort}
                />
                {mined.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay productos con eso.</p>
                ) : (
                  (mined.groups ?? [{ id: "all", label: "", products: mined.items }]).map((group) => (
                    <div key={group.id} className="space-y-2">
                      {group.label ? (
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {group.label}
                        </p>
                      ) : null}
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
                                  {categoryLabel(product.category)} · {product.sold}/{product.supply} · {product.redemptionPlace}
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
