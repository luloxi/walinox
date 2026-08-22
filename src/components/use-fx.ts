"use client";

import { useEffect, useState } from "react";
import { useDisplay } from "@/components/display-provider";
import { cacheFxQuote, FALLBACK_PER_USDT, type FxQuote } from "@/lib/fx";

export function useFx(): FxQuote {
  const { prefs } = useDisplay();
  const [quote, setQuote] = useState<FxQuote>({
    fiat: prefs.fiat,
    perUsdt: FALLBACK_PER_USDT[prefs.fiat],
    source: "fallback",
    at: "",
  });

  useEffect(() => {
    let live = true;
    setQuote({
      fiat: prefs.fiat,
      perUsdt: FALLBACK_PER_USDT[prefs.fiat],
      source: "fallback",
      at: "",
    });
    const timer = window.setTimeout(() => {
      void fetch(`/api/fx?fiat=${encodeURIComponent(prefs.fiat)}`)
        .then((res) => res.json() as Promise<FxQuote>)
        .then((data) => {
          if (!live || !Number.isFinite(data.perUsdt) || data.perUsdt <= 0) return;
          cacheFxQuote(data);
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
  }, [prefs.fiat]);

  return quote.fiat === prefs.fiat ? quote : { ...quote, fiat: prefs.fiat, perUsdt: FALLBACK_PER_USDT[prefs.fiat] };
}
