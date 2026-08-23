"use client";

import { cn } from "@/lib/utils";

export function UnitToggle({
  value,
  fiatLabel,
  onChange,
  className,
}: {
  value: "fiat" | "usdt";
  fiatLabel: string;
  onChange: (next: "fiat" | "usdt") => void;
  className?: string;
}) {
  return (
    <div
      className={cn("grid h-11 w-[6.5rem] shrink-0 grid-cols-2 gap-0.5 rounded-lg bg-muted p-0.5", className)}
      role="group"
      aria-label="Moneda"
    >
      <button
        type="button"
        className={cn(
          "rounded-md text-xs font-medium transition-colors",
          value === "fiat" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
        )}
        onClick={() => onChange("fiat")}
      >
        {fiatLabel}
      </button>
      <button
        type="button"
        className={cn(
          "rounded-md text-xs font-medium transition-colors",
          value === "usdt" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
        )}
        onClick={() => onChange("usdt")}
      >
        USDT
      </button>
    </div>
  );
}
