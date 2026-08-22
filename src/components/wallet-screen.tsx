"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Guide } from "@/components/guide";
import { Hint } from "@/components/hint";
import { SendFlow } from "@/components/send-flow";
import { ReceiveFlow } from "@/components/receive-flow";
import { WalletCard } from "@/components/wallet-card";

export function WalletScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const tab = search.get("tab") === "recibir" ? "recibir" : "enviar";

  function setTab(next: string) {
    const to = search.get("to");
    const params = new URLSearchParams();
    if (next === "recibir") params.set("tab", "recibir");
    if (to && next === "enviar") params.set("to", to);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Guide />
      <div className="shrink-0">
        <WalletCard />
      </div>
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2">
          <TabsList className="w-full">
            <TabsTrigger value="enviar" className="flex-1 cursor-pointer">
              Enviar
            </TabsTrigger>
            <TabsTrigger value="recibir" className="flex-1 cursor-pointer">
              Recibir
            </TabsTrigger>
          </TabsList>
          <Hint text="Misma billetera: mandás USDT o mostrás tu address / cobrás un QR." />
        </div>
        <TabsContent value="enviar" className="mt-3 min-h-0 flex-1 overflow-hidden">
          <SendFlow />
        </TabsContent>
        <TabsContent value="recibir" className="mt-3 min-h-0 flex-1 overflow-hidden">
          <ReceiveFlow />
        </TabsContent>
      </Tabs>
    </div>
  );
}
