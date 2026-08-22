"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { UsdtLogo } from "@/components/usdt-logo";
import { SectionBar } from "@/components/section-bar";
import { Button } from "@/components/ui/button";
import { productsByStore } from "@/lib/catalog";
import { storeById } from "@/lib/stores";
import type { Product } from "@/lib/vale";

export function StoreView() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id ?? "");
  const store = storeById(id);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setProducts(productsByStore(id));
  }, [id]);

  const name = store?.name ?? products[0]?.issuerName ?? id;

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto">
      <SectionBar title={name} hint={store?.place}>
        <Button asChild variant="ghost" className="h-8 px-2">
          <Link href="/tienda">Volver</Link>
        </Button>
      </SectionBar>
      <ul className="mt-4 space-y-2 pb-4">
        {products.map((product) => (
          <li key={product.id}>
            <Link
              href={`/products/${encodeURIComponent(product.id)}`}
              className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06]"
            >
              <span className="text-sm font-medium">{product.title}</span>
              <span className="inline-flex items-center gap-1 text-sm">
                {product.price}
                <UsdtLogo className="size-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
