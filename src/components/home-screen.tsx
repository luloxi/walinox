"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { WalletCard } from "@/components/wallet-card";
import { Guide } from "@/components/guide";
import { ActivityList } from "@/components/activity-list";
import { listReceipts, type Receipt } from "@/lib/receipts";

export function HomeScreen() {
  const [recent, setRecent] = useState<Receipt[]>([]);

  useEffect(() => {
    setRecent(listReceipts().slice(0, 4));
  }, []);

  return (
    <div className="space-y-5">
      <WalletCard />
      <Guide />
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/send"
          className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl bg-teal-400 text-zinc-950"
        >
          <ArrowUpRight className="size-6" />
          <span className="text-sm font-semibold">Enviar</span>
        </Link>
        <Link
          href="/receive"
          className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl bg-white/10 ring-1 ring-white/10"
        >
          <ArrowDownLeft className="size-6" />
          <span className="text-sm font-semibold">Recibir</span>
        </Link>
      </div>
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Actividad</h2>
          <Link href="/summary" className="cursor-pointer text-xs text-teal-300">
            Ver todo
          </Link>
        </div>
        <ActivityList receipts={recent} empty="Todavía no moviste nada." />
      </section>
    </div>
  );
}
