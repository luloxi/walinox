"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function RegisterServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const registration of regs) void registration.unregister();
      });
      return;
    }

    let reg: ServiceWorkerRegistration | undefined;
    let cancelled = false;

    function track(registration: ServiceWorkerRegistration) {
      reg = registration;
      if (registration.waiting) setWaiting(registration.waiting);

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(registration.waiting);
          }
        });
      });
    }

    const onController = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onController);

    const register = () => {
      void navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          if (cancelled) return;
          track(registration);
          if (navigator.onLine) void registration.update().catch(() => undefined);
        })
        .catch(() => undefined);
    };

    let idleId: number | undefined;
    let timer: number | undefined;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(register, { timeout: 2500 });
    } else {
      timer = window.setTimeout(register, 1);
    }

    const interval = window.setInterval(() => {
      if (navigator.onLine) void reg?.update();
    }, 60_000);

    return () => {
      cancelled = true;
      if (idleId != null) window.cancelIdleCallback(idleId);
      if (timer != null) window.clearTimeout(timer);
      window.clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", onController);
    };
  }, []);

  function applyUpdate() {
    if (!waiting) return;
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  if (!waiting) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-border bg-popover px-4 py-3 shadow-lg ring-1 ring-black/5">
        <p className="min-w-0 flex-1 text-sm">Hay una versión nueva de Walinox.</p>
        <Button type="button" className="h-10 shrink-0" onClick={applyUpdate}>
          Actualizar
        </Button>
      </div>
    </div>
  );
}
