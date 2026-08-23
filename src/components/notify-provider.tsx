"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useWallet } from "@/components/wallet-provider";
import { Button } from "@/components/ui/button";
import { isLocalHost } from "@/lib/dev";
import {
  BANNER_KEY,
  INBOX_EVENT,
  NOTIFY_OFF_KEY,
  addInboxItem,
  buildNotify,
  pullRemoteInbox,
  requestNotifyPermission,
  showLocalNotification,
  subscribePush,
} from "@/lib/notify";
import { maybeDeliverMonthlyReport } from "@/lib/monthly-report";

const LAST_USDT_KEY = "walinox.lastUsdt.";

export function NotifyProvider({ children }: { children: ReactNode }) {
  const { wallet } = useWallet();
  const address = wallet?.address;
  const sign = wallet?.signTypedData;
  const lastPoll = useRef(0);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | undefined;
      if (data?.type === "NOTIFICATION_CLICK" && data.url) {
        window.location.assign(data.url);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!address || !sign) return;
    let live = true;

    async function sync() {
      if (!live || !address || !sign) return;
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        localStorage.getItem(NOTIFY_OFF_KEY) !== "1"
      ) {
        await subscribePush(address, sign);
      }
      const added = await pullRemoteInbox(address, sign);
      if (added > 0) window.dispatchEvent(new Event(INBOX_EVENT));
      maybeDeliverMonthlyReport(address);
    }

    void sync();
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (now - lastPoll.current < 20_000) return;
      lastPoll.current = now;
      void sync();
    }, 20_000);

    const onFocus = () => {
      lastPoll.current = 0;
      void sync();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [address, sign]);

  useEffect(() => {
    if (!address || isLocalHost()) return;
    const walletAddress = address;
    let live = true;
    const key = LAST_USDT_KEY + walletAddress.toLowerCase();

    async function check() {
      try {
        const res = await fetch(`/api/balance?address=${walletAddress}`);
        const data = (await res.json()) as { usdt?: string | null };
        if (!live || typeof data.usdt !== "string") return;
        const prev = localStorage.getItem(key);
        localStorage.setItem(key, data.usdt);
        if (prev == null) return;
        if (Number(data.usdt) > Number(prev) + 0.000001) {
          const item = addInboxItem(
            buildNotify({
              kind: "incoming",
              from: walletAddress,
              to: walletAddress,
              amount: data.usdt,
              token: "USDT",
            }),
          );
          await showLocalNotification(item.title, { body: item.body, url: item.url, tag: item.id });
        }
      } catch {
        /* ignore */
      }
    }

    void check();
    const timer = window.setInterval(() => void check(), 45_000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [address]);

  return (
    <>
      {children}
      <NotifyBanner address={address} sign={sign} />
    </>
  );
}

function NotifyBanner({
  address,
  sign,
}: {
  address?: string;
  sign?: (typed: import("@/lib/wallet").Signable) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!address) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(BANNER_KEY) === "1") return;
    if (localStorage.getItem(NOTIFY_OFF_KEY) === "1") return;
    const timer = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [address]);

  if (!open || !address || !sign) return null;
  const walletAddress = address;

  async function enable() {
    const permission = await requestNotifyPermission();
    if (permission === "granted") {
      await subscribePush(walletAddress, sign);
    }
    localStorage.setItem(BANNER_KEY, "1");
    setOpen(false);
  }

  function dismiss() {
    localStorage.setItem(BANNER_KEY, "1");
    setOpen(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-30 rounded-2xl bg-popover p-3 ring-1 ring-border md:inset-x-auto md:right-6 md:bottom-6 md:w-96">
      <p className="text-sm">Activá avisos para enterarte cuando te mandan USDT o un vale.</p>
      <div className="mt-3 flex gap-2">
        <Button type="button" className="h-10 flex-1" onClick={() => void enable()}>
          Activar
        </Button>
        <Button type="button" variant="outline" className="h-10 flex-1" onClick={dismiss}>
          Ahora no
        </Button>
      </div>
    </div>
  );
}
