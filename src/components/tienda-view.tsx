"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/hint";
import { UsdtLogo } from "@/components/usdt-logo";
import { listStores, productsByStore } from "@/lib/catalog";
import type { Store } from "@/lib/stores";

export function TiendaView() {
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    setStores(listStores());
  }, []);

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto">
      <div className="flex items-center justify-end gap-2">
        <Hint text="Cada tienda publica vales NFT de un bien físico. Se pagan en USDT y se canjean en el local. El emisor registra el canje." />
        <Button asChild variant="secondary" className="h-9">
          <Link href="/products/new">Publicar</Link>
        </Button>
        <Button asChild variant="ghost" className="h-9">
          <Link href="/vales">Vales</Link>
        </Button>
        <Button asChild variant="ghost" className="h-9">
          <Link href="/vales/redeem">Canjear</Link>
        </Button>
      </div>
      <ul className="mt-4 space-y-2 pb-4">
        {stores.map((store) => {
          const items = productsByStore(store.id);
          return (
            <li key={store.id}>
              <Link
                href={`/tienda/${store.id}`}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06]"
              >
                <span>
                  <span className="block text-sm font-medium">{store.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {store.place} · {items.length}
                  </span>
                </span>
                {items[0] ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    desde {items[0].price}
                    <UsdtLogo className="size-3.5" />
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
