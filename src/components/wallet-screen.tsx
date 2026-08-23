"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Plus, ScanLine } from "lucide-react";
import { WalletCard } from "@/components/wallet-card";
import { ActivityList } from "@/components/activity-list";
import { OnrampPanel } from "@/components/onramp-panel";
import { SectionLabel } from "@/components/empty-state";
import { useWallet } from "@/components/wallet-provider";
import { listReceiptsFor, RECEIPTS_EVENT, type Receipt } from "@/lib/receipts";
import { cn } from "@/lib/utils";

const SendFlow = dynamic(() => import("@/components/send-flow").then((m) => m.SendFlow), {
  ssr: false,
  loading: () => (
    <div className="flex h-40 items-center justify-center">
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  ),
});

const ReceiveFlow = dynamic(() => import("@/components/receive-flow").then((m) => m.ReceiveFlow), {
  ssr: false,
  loading: () => (
    <div className="flex h-40 items-center justify-center">
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  ),
});

const PayFlow = dynamic(() => import("@/components/pay-flow").then((m) => m.PayFlow), {
  ssr: false,
  loading: () => (
    <div className="flex h-40 items-center justify-center">
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  ),
});

const ACTIONS = [
  {
    id: "ingresar",
    label: "Ingresar",
    icon: Plus,
    tone: "bg-amber-500/15 text-amber-700 ring-amber-500/25 dark:text-amber-400",
    active: "bg-amber-500 text-white shadow-amber-500/30 ring-amber-500/40",
  },
  {
    id: "recibir",
    label: "Recibir",
    icon: ArrowDownLeft,
    tone: "bg-sky-500/15 text-sky-600 ring-sky-500/25 dark:text-sky-400",
    active: "bg-sky-500 text-white shadow-sky-500/30 ring-sky-500/40",
  },
  {
    id: "enviar",
    label: "Enviar",
    icon: ArrowUpRight,
    tone: "bg-violet-500/15 text-violet-600 ring-violet-500/25 dark:text-violet-400",
    active: "bg-violet-500 text-white shadow-violet-500/30 ring-violet-500/40",
  },
  {
    id: "pagar",
    label: "Pagar",
    icon: ScanLine,
    tone: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400",
    active: "bg-emerald-500 text-white shadow-emerald-500/30 ring-emerald-500/40",
  },
] as const;

export function WalletScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const { wallet } = useWallet();
  const tab = search.get("tab");
  const [recent, setRecent] = useState<Receipt[]>([]);

  useEffect(() => {
    function refresh() {
      setRecent(listReceiptsFor(wallet?.address).slice(0, 5));
    }
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener(RECEIPTS_EVENT, refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(RECEIPTS_EVENT, refresh);
    };
  }, [wallet?.address]);

  function go(next: string) {
    const to = search.get("to");
    const params = new URLSearchParams();
    if (next) params.set("tab", next);
    if (to && next === "enviar") params.set("to", to);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }

  const inFlow = tab === "enviar" || tab === "recibir" || tab === "pagar" || tab === "ingresar";

  if (inFlow) {
    return (
      <div className="flex min-h-full flex-col gap-3">
        <div className="shrink-0">
          <button
            type="button"
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => go("")}
          >
            <ArrowLeft className="size-4" />
            Billetera
          </button>
        </div>
        <div className="min-h-0 flex-1">
          {tab === "enviar" ? (
            <SendFlow />
          ) : tab === "ingresar" ? (
            <OnrampPanel />
          ) : tab === "pagar" ? (
            <PayFlow />
          ) : (
            <ReceiveFlow />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-6">
      <WalletCard />

      <div className="flex w-full items-start justify-between gap-2">
        {ACTIONS.map((item) => {
          const Icon = item.icon;
          const on = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-2 transition-colors active:scale-95"
              onClick={() => go(tab === item.id ? "" : item.id)}
            >
              <span
                className={cn(
                  "flex size-14 items-center justify-center rounded-2xl ring-1 shadow-sm transition-colors md:size-16",
                  on ? item.active : item.tone,
                )}
              >
                <Icon className="size-7 md:size-8" strokeWidth={2.25} />
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium md:text-xs",
                  on ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <section className="flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Recientes</SectionLabel>
          <Link href="/summary" className="cursor-pointer text-xs text-primary">
            Ver todos
          </Link>
        </div>
        <div className="mt-3">
          <ActivityList receipts={recent} empty="Todavía no hay movimientos" />
        </div>
      </section>
    </div>
  );
}
