"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Package, PackageSearch } from "lucide-react";
import { ActivityList } from "@/components/activity-list";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionLabel } from "@/components/empty-state";
import { PosView } from "@/components/pos-view";
import { ProductFilters } from "@/components/product-filters";
import { ProductForm } from "@/components/product-form";
import { useWallet } from "@/components/wallet-provider";
import { Price } from "@/components/price";
import { browseProducts, categoryLabel, type ProductSort } from "@/lib/categories";
import { productsByIssuer, removeProduct } from "@/lib/catalog";
import { listReceipts, type Receipt } from "@/lib/receipts";
import { seedLivedIn } from "@/lib/seed";
import type { Product } from "@/lib/vale";

/** Seller local: list products + charge offline. Public marketplace stays off MVP. */
export function TiendaView() {
  const { wallet } = useWallet();
  const [mine, setMine] = useState<Product[]>([]);
  const [recent, setRecent] = useState<Receipt[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<ProductSort>("categoria");

  function refresh() {
    seedLivedIn(wallet?.address);
    setMine(wallet ? productsByIssuer(wallet.address) : []);
    setRecent(listReceipts().slice(0, 5));
  }

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [wallet?.address]);

  const mined = useMemo(
    () => browseProducts(mine, { query, category, sort }),
    [mine, query, category, sort],
  );

  return (
    <div className="flex w-full flex-col gap-8 pb-6 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      <div className="space-y-6 lg:sticky lg:top-2">
        <PosView products={mine} />

        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionLabel>Productos</SectionLabel>
            <Button type="button" size="sm" className="h-8" onClick={() => setPublishing((value) => !value)}>
              {publishing ? "Cerrar" : "Nuevo"}
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
            <p className="text-sm text-muted-foreground">
              Armá el menú del local. Al cobrar, el comprador firma sin internet (QR, NFC, sonido, etc.).
            </p>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <SectionLabel>Recientes</SectionLabel>
            <Link href="/summary" className="cursor-pointer text-xs text-primary">
              Ver todos
            </Link>
          </div>
          <ActivityList receipts={recent} empty="Todavía no hay movimientos" />
        </section>
      </div>

      <section>
        <SectionLabel>Catálogo</SectionLabel>
        <p className="mt-1 mb-3 text-xs text-muted-foreground">Para la caja. Ordená por categoría.</p>
        {mine.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Todavía no hay productos"
            body="Publicá algo y cobralo en la caja con cualquier canal offline."
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
              <EmptyState icon={PackageSearch} title="No hay productos con eso" body="Probá otra categoría o búsqueda." />
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
  );
}
