"use client";

import { useDisplay } from "@/components/display-provider";
import { useFx } from "@/components/use-fx";
import { UsdtLogo } from "@/components/usdt-logo";
import { formatFiat, formatUsdt, usdtToFiat } from "@/lib/fx";
import { cn } from "@/lib/utils";

export function Price({
  usdt,
  rate,
  ars: fiatOverride,
  size = "md",
  className,
}: {
  usdt: string | number;
  rate?: number;
  ars?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { prefs } = useDisplay();
  const fx = useFx();
  const n = typeof usdt === "number" ? usdt : Number(usdt);
  const used = rate ?? fx.perUsdt;
  const fiatValue =
    prefs.fiat === "ARS" && fiatOverride != null
      ? fiatOverride
      : Number.isFinite(n)
        ? usdtToFiat(n, used)
        : 0;
  const usdtLabel = formatUsdt(n);
  const fiatLabel = formatFiat(fiatValue, prefs.fiat);

  const bigClass =
    size === "lg"
      ? "text-3xl font-semibold tabular-nums"
      : size === "sm"
        ? "text-sm font-medium tabular-nums"
        : "text-lg font-medium tabular-nums";
  const subClass = size === "lg" ? "text-sm" : "text-[11px]";
  const fiatFirst = prefs.primary === "fiat";

  return (
    <span className={cn("inline-flex flex-col items-start leading-tight", className)}>
      {fiatFirst ? (
        <>
          <span className={bigClass}>{fiatLabel}</span>
          <span className={cn("inline-flex items-center gap-1 text-muted-foreground", subClass)}>
            {usdtLabel}
            <UsdtLogo className={size === "lg" ? "size-3.5" : "size-3"} />
          </span>
        </>
      ) : (
        <>
          <span className={cn("inline-flex items-center gap-1", bigClass)}>
            {usdtLabel}
            <UsdtLogo className={size === "lg" ? "size-7" : size === "sm" ? "size-3.5" : "size-4"} />
          </span>
          <span className={cn("text-muted-foreground", subClass)}>{fiatLabel}</span>
        </>
      )}
    </span>
  );
}
