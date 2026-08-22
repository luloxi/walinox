"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SectionBar } from "@/components/section-bar";
import { Button } from "@/components/ui/button";
import { ProductBrowser } from "@/components/product-browser";
import { productsByStore } from "@/lib/catalog";
import { storeById } from "@/lib/stores";
import type { Product } from "@/lib/vale";

export function StoreView() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id ?? "");
  const store = storeById(id);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setProducts(productsByStore(id)), 0);
    return () => window.clearTimeout(timer);
  }, [id]);

  const name = store?.name ?? products[0]?.issuerName ?? id;

  return (
    <div className="flex w-full flex-col pb-6">
      <SectionBar hint={store?.place}>
        <Button asChild variant="ghost" className="h-8 px-2">
          <Link href="/tienda">Volver</Link>
        </Button>
      </SectionBar>
      <p className="mt-3 text-lg font-semibold">{name}</p>
      <div className="mt-4">
        <ProductBrowser products={products} empty="Esta tienda no tiene productos con eso." />
      </div>
    </div>
  );
}
