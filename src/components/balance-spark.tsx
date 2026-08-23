"use client";

import { useEffect, useMemo, useState } from "react";
import { useDisplay } from "@/components/display-provider";
import { useFx } from "@/components/use-fx";
import { spark24h, sparkPath } from "@/lib/balance-spark";
import { formatFiat, formatUsdt, usdtToFiat } from "@/lib/fx";
import { listReceipts, type Receipt } from "@/lib/receipts";
import { cn } from "@/lib/utils";

const W = 168;
const H = 48;

function useDaySpark(address: string, nowUsdt: number) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => setReceipts(listReceipts()), 0);
    return () => window.clearTimeout(timer);
  }, [address]);
  return useMemo(() => spark24h(receipts, address, nowUsdt), [receipts, address, nowUsdt]);
}

export function BalanceSpark({ address, nowUsdt }: { address: string; nowUsdt: number }) {
  const { prefs } = useDisplay();
  const fx = useFx();
  const { points, deltaUsdt } = useDaySpark(address, nowUsdt);

  const { line, area } = sparkPath(points, W, H);
  const up = deltaUsdt > 0.000001;
  const down = deltaUsdt < -0.000001;
  const tone = up ? "gain" : down ? "loss" : "flat";
  const abs = Math.abs(deltaUsdt);
  const label = prefs.primary === "fiat" ? formatFiat(usdtToFiat(abs, fx.perUsdt), prefs.fiat) : formatUsdt(abs);
  const signed = up ? `+${label}` : down ? `−${label}` : label;

  return (
    <div className="hidden w-44 shrink-0 flex-col items-end justify-center gap-1 md:flex">
      <p
        className={cn(
          "text-sm font-medium tabular-nums",
          tone === "gain" && "text-emerald-600 dark:text-emerald-400",
          tone === "loss" && "text-rose-600 dark:text-rose-400",
          tone === "flat" && "text-muted-foreground",
        )}
      >
        {signed}
        <span className="ml-1 text-[11px] font-normal text-muted-foreground">24 h</span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-12 w-full" aria-hidden>
        <path
          d={area}
          className={cn(
            tone === "gain" && "fill-emerald-500/25",
            tone === "loss" && "fill-rose-500/25",
            tone === "flat" && "fill-muted-foreground/10",
          )}
        />
        <path
          d={line}
          fill="none"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          className={cn(
            tone === "gain" && "stroke-emerald-500",
            tone === "loss" && "stroke-rose-500",
            tone === "flat" && "stroke-muted-foreground/50",
          )}
        />
      </svg>
    </div>
  );
}

export function BalanceDelta({ address, nowUsdt }: { address: string; nowUsdt: number }) {
  const { prefs } = useDisplay();
  const fx = useFx();
  const { deltaUsdt } = useDaySpark(address, nowUsdt);

  const up = deltaUsdt > 0.000001;
  const down = deltaUsdt < -0.000001;
  if (!up && !down) return null;
  const abs = Math.abs(deltaUsdt);
  const label = prefs.primary === "fiat" ? formatFiat(usdtToFiat(abs, fx.perUsdt), prefs.fiat) : formatUsdt(abs);
  return (
    <p
      className={cn(
        "text-xs font-medium tabular-nums md:hidden",
        up && "text-emerald-600 dark:text-emerald-400",
        down && "text-rose-600 dark:text-rose-400",
      )}
    >
      {up ? "+" : "−"}
      {label} · 24 h
    </p>
  );
}
