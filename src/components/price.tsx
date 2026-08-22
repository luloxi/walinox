"use client";

import { formatArs, formatUsdt, usdtToArs } from "@/lib/fx";
import { useFx } from "@/components/use-fx";
import { UsdtLogo } from "@/components/usdt-logo";
import { cn } from "@/lib/utils";

export function Price({
  usdt,
  size = "md",
  className,
}: {
  usdt: string | number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const fx = useFx();
  const n = typeof usdt === "number" ? usdt : Number(usdt);
  const ars = Number.isFinite(n) ? usdtToArs(n, fx.arsPerUsdt) : 0;
  const usdtLabel = formatUsdt(n);

  const arsClass =
    size === "lg"
      ? "text-3xl font-semibold tabular-nums"
      : size === "sm"
        ? "text-sm font-medium tabular-nums"
        : "text-lg font-medium tabular-nums";
  const subClass = size === "lg" ? "text-sm" : "text-[11px]";

  return (
    <span className={cn("inline-flex flex-col items-start leading-tight", className)}>
      <span className={arsClass}>{formatArs(ars)}</span>
      <span className={cn("inline-flex items-center gap-1 text-muted-foreground", subClass)}>
        {usdtLabel}
        <UsdtLogo className={size === "lg" ? "size-3.5" : "size-3"} />
      </span>
    </span>
  );
}
