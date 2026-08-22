"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QrScanner } from "@/components/qr-scanner";
import { UsdtLogo } from "@/components/usdt-logo";
import { decodeProduct, listProducts, saveProduct } from "@/lib/catalog";
import type { Product } from "@/lib/vale";

export function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProducts(listProducts());
  }, []);

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto">
      <h2 className="text-lg font-semibold">Productos</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Publicá un bien físico como NFT. Se vende en USDT y se canjea en el local.
      </p>
      <div className="mt-4 flex gap-2">
        <Button asChild className="h-11 flex-1">
          <Link href="/products/new">Publicar</Link>
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-11"
          onClick={() => setScanning((value) => !value)}
        >
          {scanning ? "Parar" : "Importar QR"}
        </Button>
      </div>
      <div className="mt-3">
        <QrScanner
          active={scanning}
          onResult={(text) => {
            try {
              const product = decodeProduct(text);
              saveProduct(product);
              setProducts(listProducts());
              setScanning(false);
              setError(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : "QR inválido");
            }
          }}
          onError={(message) => {
            setError(message);
            setScanning(false);
          }}
        />
      </div>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      <ul className="mt-4 space-y-2 pb-4">
        {products.length === 0 ? (
          <li className="text-sm text-muted-foreground">No hay productos todavía.</li>
        ) : (
          products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/products/${product.id}`}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 hover:bg-white/[0.06]"
              >
                <span>
                  <span className="block text-sm font-medium">{product.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {product.sold}/{product.supply} emitidos · {product.issuerName}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-sm">
                  {product.price}
                  <UsdtLogo className="size-4" />
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
