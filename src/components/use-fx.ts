"use client";

import { useEffect, useState } from "react";
import { FALLBACK_ARS_PER_USDT, type FxQuote } from "@/lib/fx";

export function useFx(): FxQuote {
  const [quote, setQuote] = useState<FxQuote>({
    arsPerUsdt: FALLBACK_ARS_PER_USDT,
    source: "fallback",
    at: "",
  });

  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      void fetch("/api/fx")
        .then((res) => res.json() as Promise<FxQuote>)
        .then((data) => {
          if (!live || !Number.isFinite(data.arsPerUsdt) || data.arsPerUsdt <= 0) return;
          setQuote(data);
        })
        .catch(() => {
          /* keep fallback */
        });
    }, 0);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, []);

  return quote;
}
