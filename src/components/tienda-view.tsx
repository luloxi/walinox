"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionBar } from "@/components/section-bar";
import { UsdtLogo } from "@/components/usdt-logo";
import { ProductForm } from "@/components/product-form";
import { ValesView } from "@/components/vales-view";
import { RedeemView } from "@/components/redeem-view";
import { listStores, productsByStore } from "@/lib/catalog";
import type { Store } from "@/lib/stores";

export function TiendaView() {
  const router = useRouter();
  const search = useSearchParams();
  const tab = search.get("tab") ?? "comprar";
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    setStores(listStores());
  }, []);

  function setTab(next: string) {
    router.replace(next === "comprar" ? "/tienda" : `/tienda?tab=${next}`);
  }

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto">
      <Tabs value={tab} onValueChange={setTab}>
        <SectionBar
          title={tab === "vales" ? "Vales" : tab === "vender" ? "Vender" : "Locales"}
          hint="1. Comprás. 2. Te queda un vale. 3. Lo mostrás en el local."
        >
          <TabsList>
            <TabsTrigger value="comprar" className="cursor-pointer">
              Comprar
            </TabsTrigger>
            <TabsTrigger value="vales" className="cursor-pointer">
              Vales
            </TabsTrigger>
            <TabsTrigger value="vender" className="cursor-pointer">
              Vender
            </TabsTrigger>
          </TabsList>
        </SectionBar>

        <TabsContent value="comprar" className="mt-4">
          <ul className="space-y-2 pb-4">
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
                      <span className="text-xs text-muted-foreground">{store.place}</span>
                    </span>
                    {items[0] ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {items[0].price}
                        <UsdtLogo className="size-3.5" />
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </TabsContent>

        <TabsContent value="vales" className="mt-4">
          <ValesView embedded />
        </TabsContent>

        <TabsContent value="vender" className="mt-4 space-y-6">
          <ProductForm embedded />
          <RedeemView embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
