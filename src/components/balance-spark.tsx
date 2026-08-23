"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDisplay } from "@/components/display-provider";
import { useFx } from "@/components/use-fx";
import { spark24h, sparkPath } from "@/lib/balance-spark";
import { formatFiat, formatUsdt, usdtToFiat } from "@/lib/fx";
import { listReceipts, type Receipt } from "@/lib/receipts";
import { cn } from "@/lib/utils";

const W = 320;
const H = 64;

function useDaySpark(address: string, nowUsdt: number) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => setReceipts(listReceipts()), 0);
    return () => window.clearTimeout(timer);
  }, [address]);
  return useMemo(() => spark24h(receipts, address, nowUsdt), [receipts, address, nowUsdt]);
}

function SparkSvg({
  line,
  area,
  tone,
  className,
}: {
  line: string;
  area: string;
  tone: "gain" | "loss" | "flat";
  className?: string;
}) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden>
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
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        className={cn(
          tone === "gain" && "stroke-emerald-500",
          tone === "loss" && "stroke-rose-500",
          tone === "flat" && "stroke-muted-foreground/50",
        )}
      />
    </svg>
  );
}

export function BalanceSpark({ address, nowUsdt }: { address: string; nowUsdt: number }) {
  const { prefs } = useDisplay();
  const fx = useFx();
  const { points, deltaUsdt } = useDaySpark(address, nowUsdt);
  const [open, setOpen] = useState(false);

  const { line, area } = sparkPath(points, W, H);
  const up = deltaUsdt > 0.000001;
  const down = deltaUsdt < -0.000001;
  const tone = up ? "gain" : down ? "loss" : "flat";
  const abs = Math.abs(deltaUsdt);
  const label = prefs.primary === "fiat" ? formatFiat(usdtToFiat(abs, fx.perUsdt), prefs.fiat) : formatUsdt(abs);
  const signed = up ? `+${label}` : down ? `−${label}` : label;

  return (
    <>
      <div className="hidden min-w-0 flex-1 flex-col items-end justify-center gap-1 md:flex lg:max-w-md">
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
        <SparkSvg line={line} area={area} tone={tone} className="h-16 w-full lg:h-20" />
      </div>

      <div className="md:hidden">
        <button
          type="button"
          className="mt-2 inline-flex cursor-pointer items-center gap-1"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              tone === "gain" && "text-emerald-600 dark:text-emerald-400",
              tone === "loss" && "text-rose-600 dark:text-rose-400",
              tone === "flat" && "text-muted-foreground",
            )}
          >
            {signed} · 24 h
          </span>
          <ChevronDown
            className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
        {open ? <SparkSvg line={line} area={area} tone={tone} className="mt-3 h-24 w-full" /> : null}
      </div>
    </>
  );
}
