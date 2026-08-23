"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, ScanLine, Users } from "lucide-react";
import { SendFlow } from "@/components/send-flow";
import { ReceiveFlow } from "@/components/receive-flow";
import { WalletCard } from "@/components/wallet-card";
import { ActivityList } from "@/components/activity-list";
import { listReceipts, type Receipt } from "@/lib/receipts";

const ACTIONS = [
  { id: "recibir", label: "Depositar", icon: ArrowDownLeft, href: null as string | null },
  { id: "pagar", label: "Pagar", icon: ScanLine, href: null },
  { id: "enviar", label: "Enviar", icon: ArrowUpRight, href: null },
  { id: "contactos", label: "Contactos", icon: Users, href: "/contacts" },
] as const;

export function WalletScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const tab = search.get("tab");
  const [recent, setRecent] = useState<Receipt[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setRecent(listReceipts().slice(0, 5)), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function go(next: string) {
    const to = search.get("to");
    const params = new URLSearchParams();
    if (next) params.set("tab", next);
    if (to && next === "enviar") params.set("to", to);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }

  const inFlow = tab === "enviar" || tab === "recibir" || tab === "pagar";

  if (inFlow) {
    return (
      <div className="flex min-h-full flex-col gap-3">
        <div className="shrink-0">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-primary hover:text-primary"
            onClick={() => go("")}
          >
            <ArrowLeft className="size-4" />
            Volver al saldo
          </button>
        </div>
        <div className="min-h-0 flex-1">
          {tab === "enviar" ? (
            <SendFlow />
          ) : (
            <ReceiveFlow focus={tab === "pagar" ? "scan" : "me"} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-6">
      <WalletCard>
        <div className="mt-5 flex justify-center gap-2 md:mt-6 md:gap-3">
          {ACTIONS.map((item) => {
            const Icon = item.icon;
            const on = tab === item.id;
            const box = `flex size-12 cursor-pointer items-center justify-center rounded-2xl ${
              on ? "bg-primary text-primary-foreground" : "bg-muted ring-1 ring-border"
            }`;
            const body = (
              <>
                <span className={box}>
                  <Icon className="size-6" />
                </span>
                <span className="text-[11px] font-medium">{item.label}</span>
              </>
            );
            const className = `flex w-14 cursor-pointer flex-col items-center gap-1.5 hover:text-foreground md:w-16 ${
              on ? "text-primary" : "text-muted-foreground"
            }`;
            if (item.href) {
              return (
                <Link key={item.id} href={item.href} className={className}>
                  {body}
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
                {body}
              </button>
            );
          })}
        </div>
      </WalletCard>

      <section className="flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Recientes</p>
          <Link href="/summary" className="cursor-pointer text-xs text-primary">
            Ver todos
          </Link>
        </div>
        <div className="mt-3">
          <ActivityList receipts={recent} empty="Todavía no hay movimientos." />
        </div>
      </section>
    </div>
  );
}
