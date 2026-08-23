"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 72;
const MAX_PULL = 120;

export function PullToRefresh({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLElement | null>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const offsetRef = useRef(0);
  const refreshingRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    function setPull(value: number) {
      offsetRef.current = value;
      setOffset(value);
    }

    function onTouchStart(event: TouchEvent) {
      if (refreshingRef.current) return;
      if (el!.scrollTop > 1) {
        pulling.current = false;
        return;
      }
      startY.current = event.touches[0]?.clientY ?? 0;
      pulling.current = true;
    }

    function onTouchMove(event: TouchEvent) {
      if (!pulling.current || refreshingRef.current) return;
      if (el!.scrollTop > 1) {
        pulling.current = false;
        setPull(0);
        return;
      }
      const y = event.touches[0]?.clientY ?? 0;
      const delta = y - startY.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }
      const resisted = Math.min(MAX_PULL, delta * 0.45);
      setPull(resisted);
      if (resisted > 6) event.preventDefault();
    }

    function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      if (offsetRef.current >= THRESHOLD && !refreshingRef.current) {
        setRefreshing(true);
        setPull(THRESHOLD * 0.7);
        window.setTimeout(() => {
          window.location.reload();
        }, 280);
        return;
      }
      setPull(0);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const armed = offset >= THRESHOLD;

  return (
    <main ref={scrollerRef} className={cn("relative overscroll-y-contain", className)}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        style={{ height: Math.max(offset, refreshing ? 40 : 0) }}
        aria-hidden
      >
        <div
          className={cn(
            "mt-2 flex size-9 items-center justify-center rounded-full bg-popover text-muted-foreground shadow-md ring-1 ring-border transition-colors",
            (armed || refreshing) && "text-primary",
          )}
          style={{
            opacity: refreshing ? 1 : Math.min(1, offset / (THRESHOLD * 0.6)),
            transform: `translateY(${Math.max(0, offset - 36)}px) rotate(${refreshing ? 0 : offset * 2.5}deg)`,
          }}
        >
          <Loader2 className={cn("size-4", (armed || refreshing) && "animate-spin")} />
        </div>
      </div>

      <div
        className="min-h-full w-full max-w-none"
        style={{
          transform: offset || refreshing ? `translateY(${offset}px)` : undefined,
          transition: pulling.current ? undefined : "transform 180ms ease-out",
        }}
      >
        {children}
      </div>
    </main>
  );
}
