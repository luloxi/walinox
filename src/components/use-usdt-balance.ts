"use client";

import { useEffect, useState } from "react";
import { isLocalHost, MOCK_USDT_BALANCE } from "@/lib/dev";

export function useUsdtBalance(address?: string) {
  const [usdt, setUsdt] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!address) return;
    if (isLocalHost()) {
      setUsdt(MOCK_USDT_BALANCE);
      setOffline(false);
      return;
    }
    let live = true;
    fetch(`/api/balance?address=${address}`)
      .then((res) => res.json())
      .then((data: { usdt?: string | null; offline?: boolean }) => {
        if (!live) return;
        setUsdt(typeof data.usdt === "string" ? data.usdt : null);
        setOffline(Boolean(data.offline));
      })
      .catch(() => {
        if (!live) return;
        setUsdt(null);
        setOffline(true);
      });
    return () => {
      live = false;
    };
  }, [address]);

  return { usdt, offline };
}
