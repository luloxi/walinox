"use client";

import { useMemo, useState } from "react";
import { ProductFilters } from "@/components/product-filters";
import { ProductTile } from "@/components/product-tile";
import { browseProducts, type ProductSort } from "@/lib/categories";
import type { Store } from "@/lib/stores";
import type { Product } from "@/lib/vale";

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {products.map((product) => (
        <ProductTile key={product.id} product={product} />
      ))}
    </div>
  );
}

export function ProductBrowser({
  products,
  stores,
  empty,
  showStores = true,
}: {
  products: Product[];
  stores?: Store[];
  empty: string;
  showStores?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<ProductSort>("categoria");
  const { items, groups } = useMemo(
    () => browseProducts(products, { query, category, sort }),
    [products, query, category, sort],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 bg-background py-1">
        <ProductFilters
          query={query}
          onQuery={setQuery}
          category={category}
          onCategory={setCategory}
          stores={showStores ? stores : undefined}
          sort={sort}
          onSort={setSort}
        />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : groups ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.id}>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group.label}
              </p>
              <ProductGrid products={group.products} />
            </section>
          ))}
        </div>
      ) : (
        <ProductGrid products={items} />
      )}
    </div>
  );
}
