"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WalletCard } from "@/components/wallet-card";
import { Guide } from "@/components/guide";
import { ActivityList } from "@/components/activity-list";
import { listReceipts, type Receipt } from "@/lib/receipts";

export function HomeScreen() {
  const [recent, setRecent] = useState<Receipt[]>([]);

  useEffect(() => {
    setRecent(listReceipts().slice(0, 8));
  }, []);

  return (
    <div className="relative h-full min-h-0">
      <Guide />
      <div className="flex h-full min-h-0 flex-col gap-4 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-8">
      <WalletCard actions />
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <h2 className="text-sm font-medium">Actividad</h2>
          <Link href="/summary" className="cursor-pointer text-xs text-teal-300">
            Ver todo
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ActivityList receipts={recent} empty="Todavía no moviste nada." />
        </div>
      </section>
      </div>
    </div>
  );
}
