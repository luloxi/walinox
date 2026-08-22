"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Users } from "lucide-react";
import { Guide } from "@/components/guide";
import { SendFlow } from "@/components/send-flow";
import { ReceiveFlow } from "@/components/receive-flow";
import { WalletCard } from "@/components/wallet-card";
import { ActivityList } from "@/components/activity-list";
import { SectionBar } from "@/components/section-bar";
import { listReceipts, type Receipt } from "@/lib/receipts";

export function WalletScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const tab = search.get("tab");
  const [recent, setRecent] = useState<Receipt[]>([]);

  useEffect(() => {
    setRecent(listReceipts().slice(0, 5));
  }, []);

  function go(next: string) {
    const to = search.get("to");
    const params = new URLSearchParams();
    if (next) params.set("tab", next);
    if (to && next === "enviar") params.set("to", to);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }

  const actions = [
    { id: "recibir", label: "Depositar", icon: ArrowDownLeft, href: null as string | null },
    { id: "enviar", label: "Enviar", icon: ArrowUpRight, href: null },
    { id: "contactos", label: "Contactos", icon: Users, href: "/contacts" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Guide />
      <div className="shrink-0">
        <WalletCard />
      </div>
      <div className="grid shrink-0 grid-cols-3 gap-2">
        {actions.map((item) => {
          const Icon = item.icon;
          const on = tab === item.id;
          const className = `flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium ${
            on ? "bg-teal-400 text-zinc-950" : "bg-white/10 ring-1 ring-white/10"
          }`;
          if (item.href) {
            return (
              <Link key={item.id} href={item.href} className={className}>
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              className={className}
              onClick={() => go(tab === item.id ? "" : item.id)}
            >
              <Icon className="size-5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "enviar" ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <SendFlow />
        </div>
      ) : tab === "recibir" ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <ReceiveFlow />
        </div>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col">
          <SectionBar title="Movimientos" hint="Los últimos cinco. Tocá Ver todos para el historial completo.">
            <Link href="/summary" className="cursor-pointer text-xs text-teal-300">
              Ver todos
            </Link>
          </SectionBar>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            <ActivityList receipts={recent} empty="Todavía no hay movimientos." />
          </div>
        </section>
      )}
    </div>
  );
}
