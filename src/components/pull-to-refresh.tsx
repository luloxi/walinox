"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
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
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const setScroller = useCallback((node: HTMLElement | null) => {
    scrollerRef.current = node;
  }, []);

  function onTouchStart(event: React.TouchEvent) {
    if (refreshing) return;
    const el = scrollerRef.current;
    if (!el || el.scrollTop > 0) {
      pulling.current = false;
      return;
    }
    startY.current = event.touches[0]?.clientY ?? 0;
    pulling.current = true;
  }

  function onTouchMove(event: React.TouchEvent) {
    if (!pulling.current || refreshing) return;
    const el = scrollerRef.current;
    if (!el || el.scrollTop > 0) {
      pulling.current = false;
      setOffset(0);
      return;
    }
    const y = event.touches[0]?.clientY ?? 0;
    const delta = y - startY.current;
    if (delta <= 0) {
      setOffset(0);
      return;
    }
    // Resist the pull so it feels natural
    const resisted = Math.min(MAX_PULL, delta * 0.45);
    setOffset(resisted);
    if (resisted > 8) {
      event.preventDefault();
    }
  }

  function onTouchEnd() {
    if (!pulling.current) return;
    pulling.current = false;
    if (offset >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setOffset(THRESHOLD * 0.7);
      window.setTimeout(() => {
        window.location.reload();
      }, 280);
      return;
    }
    setOffset(0);
  }

  const armed = offset >= THRESHOLD;

  return (
    <main
      ref={setScroller}
      className={cn("relative overscroll-y-contain touch-pan-y", className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
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
