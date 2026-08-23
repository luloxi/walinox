"use client";

import { cn } from "@/lib/utils";

/** Official-ish Tether green */
export const TETHER_GREEN = "#26A17B";

type AppLoaderProps = {
  full?: boolean;
  className?: string;
  label?: string;
};

export function AppLoader({ full = false, className, label }: AppLoaderProps) {
  const body = (
    <div
      className={cn("flex flex-col items-center justify-center gap-3", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative size-12">
        <span
          className="walinox-loader-ping absolute inset-0 rounded-full"
          style={{ backgroundColor: TETHER_GREEN }}
        />
        <span
          className="absolute inset-[7px] flex items-center justify-center rounded-full text-[15px] font-bold leading-none text-white shadow-md"
          style={{ backgroundColor: TETHER_GREEN }}
        >
          ₮
        </span>
      </div>
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
    </div>
  );

  if (full) {
    return <div className="flex h-dvh items-center justify-center bg-background">{body}</div>;
  }
  return body;
}
