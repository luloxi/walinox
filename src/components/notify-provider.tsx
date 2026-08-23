"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useWallet } from "@/components/wallet-provider";
import { Button } from "@/components/ui/button";
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
import type { Signable } from "@/lib/wallet";

const LAST_USDT_KEY = "walinox.lastUsdt.";

type SignFn = (typed: Signable) => Promise<string>;

export function NotifyProvider({ children }: { children: ReactNode }) {
  const { wallet, source } = useWallet();
  const address = wallet?.address;
  const sign = wallet?.signTypedData;
  const signRef = useRef<SignFn | undefined>(sign);
  signRef.current = sign;
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

  // Remote push/inbox auth requires EIP-712 signatures.
  // Injected wallets (MetaMask, etc.) would open a popup every poll — never auto-sign them.
  // Local wallet can sign silently; still throttle and only when push is enabled.
  useEffect(() => {
    if (!address || source !== "local") return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (localStorage.getItem(NOTIFY_OFF_KEY) === "1") return;

    let live = true;
    const walletAddress = address;

    async function sync() {
      if (!live || !signRef.current) return;
      const signFn = signRef.current;
      await subscribePush(walletAddress, signFn);
      const added = await pullRemoteInbox(walletAddress, signFn);
      if (added > 0) window.dispatchEvent(new Event(INBOX_EVENT));
    }

    void sync();
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (now - lastPoll.current < 60_000) return;
      lastPoll.current = now;
      void sync();
    }, 60_000);

    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [address, source]);

  useEffect(() => {
    if (!address) return;
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

function NotifyBanner({ address, sign }: { address?: string; sign?: SignFn }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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
  const signFn: SignFn = sign;

  async function enable() {
    setBusy(true);
    try {
      const permission = await requestNotifyPermission();
      if (permission === "granted") {
        await subscribePush(walletAddress, signFn);
      }
      localStorage.setItem(BANNER_KEY, "1");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(BANNER_KEY, "1");
    setOpen(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-30 rounded-2xl bg-popover p-3 ring-1 ring-border md:inset-x-auto md:right-6 md:bottom-6 md:w-96">
      <p className="text-sm">Activá avisos para enterarte cuando te mandan USDT.</p>
      <div className="mt-3 flex gap-2">
        <Button type="button" className="h-10 flex-1" disabled={busy} onClick={() => void enable()}>
          {busy ? "…" : "Activar"}
        </Button>
        <Button type="button" variant="outline" className="h-10 flex-1" disabled={busy} onClick={dismiss}>
          Ahora no
        </Button>
      </div>
    </div>
  );
}
