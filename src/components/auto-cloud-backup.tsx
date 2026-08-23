"use client";

import { useEffect, useRef } from "react";
import { useWallet } from "@/components/wallet-provider";
import { CLOUD_DIRTY_EVENT, pushCloudBackup } from "@/lib/backup";

const DEBOUNCE_MS = 8_000;
const INTERVAL_MS = 3 * 60_000;

/** Pushes a cloud snapshot without signatures when the wallet is ready and online. */
export function AutoCloudBackup() {
  const { wallet, ready } = useWallet();
  const address = ready ? wallet?.address : undefined;
  const timer = useRef<number | null>(null);
  const inflight = useRef(false);

  useEffect(() => {
    if (!address) return;

    function clear() {
      if (timer.current != null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    }

    async function run() {
      if (!address || inflight.current) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      inflight.current = true;
      try {
        await pushCloudBackup(address);
      } finally {
        inflight.current = false;
      }
    }

    function schedule() {
      clear();
      timer.current = window.setTimeout(() => {
        void run();
      }, DEBOUNCE_MS);
    }

    schedule();
    const interval = window.setInterval(() => void run(), INTERVAL_MS);
    const onDirty = () => schedule();
    const onOnline = () => schedule();
    window.addEventListener(CLOUD_DIRTY_EVENT, onDirty);
    window.addEventListener("online", onOnline);

    return () => {
      clear();
      window.clearInterval(interval);
      window.removeEventListener(CLOUD_DIRTY_EVENT, onDirty);
      window.removeEventListener("online", onOnline);
    };
  }, [address]);

  return null;
}
