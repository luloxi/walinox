"use client";

import { useEffect, useState } from "react";
import { isBrowserOffline, readCachedBalance, writeCachedBalance } from "@/lib/offline-cache";

export function useUsdtBalance(address?: string) {
  const [usdt, setUsdt] = useState<string | null>(() => {
    if (!address || typeof window === "undefined") return null;
    return readCachedBalance(address)?.usdt ?? null;
  });
  const [offline, setOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setUsdt(null);
      setOffline(false);
      setCachedAt(null);
      return;
    }

    let live = true;
    const cached = readCachedBalance(address);
    if (cached) {
      setUsdt(cached.usdt);
      setCachedAt(cached.at);
    }

    async function load() {
      if (isBrowserOffline()) {
        if (!live) return;
        setOffline(true);
        if (!cached) setUsdt(null);
        return;
      }

      try {
        const res = await fetch(`/api/balance?address=${address}`);
        const data = (await res.json()) as { usdt?: string | null; offline?: boolean };
        if (!live) return;
        if (typeof data.usdt === "string") {
          setUsdt(data.usdt);
          writeCachedBalance(address!, data.usdt);
          setCachedAt(new Date().toISOString());
          setOffline(false);
        } else {
          setOffline(Boolean(data.offline) || isBrowserOffline());
          if (!cached) setUsdt(null);
        }
      } catch {
        if (!live) return;
        setOffline(true);
        if (!cached) setUsdt(null);
      }
    }

    void load();

    function onOnline() {
      void load();
    }
    function onOffline() {
      if (live) setOffline(true);
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      live = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [address]);

  return { usdt: address ? usdt : null, offline, cachedAt };
}
