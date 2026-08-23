"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { InboxList } from "@/components/inbox-list";
import { SectionLabel } from "@/components/empty-state";
import { useWallet } from "@/components/wallet-provider";
import {
  BANNER_KEY,
  NOTIFY_OFF_KEY,
  requestNotifyPermission,
  subscribePush,
} from "@/lib/notify";

function notifyStatus(): "on" | "off" | "denied" | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  if (localStorage.getItem(NOTIFY_OFF_KEY) === "1") return "off";
  return "on";
}

export function InboxView() {
  const { wallet } = useWallet();
  const [alerts, setAlerts] = useState<"on" | "off" | "denied" | "unsupported">("off");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setAlerts(notifyStatus()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function enablePush() {
    if (!wallet?.address) return;
    setBusy(true);
    try {
      const permission = await requestNotifyPermission();
      if (permission === "denied") {
        setAlerts("denied");
        return;
      }
      if (permission !== "granted") {
        setAlerts("off");
        return;
      }
      localStorage.removeItem(NOTIFY_OFF_KEY);
      localStorage.setItem(BANNER_KEY, "1");
      await subscribePush(wallet.address, (typed) => wallet.signTypedData(typed));
      setAlerts("on");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 pb-6">
      {alerts === "off" || alerts === "unsupported" || alerts === "denied" ? (
        <section className="rounded-2xl border border-border bg-card p-4">
          <SectionLabel>Push</SectionLabel>
          <p className="mt-2 text-sm text-muted-foreground">
            {alerts === "denied"
              ? "Los avisos están bloqueados en el navegador. Activálos en la config del sitio."
              : alerts === "unsupported"
                ? "Este navegador no permite avisos push."
                : "Activá notificaciones push para enterarte cuando entra USDT aunque no estés en la app."}
          </p>
          {alerts === "off" ? (
            <Button
              type="button"
              className="mt-3 h-11 w-full"
              disabled={busy || !wallet}
              onClick={() => void enablePush()}
            >
              {busy ? "Activando…" : "Activar notificaciones push"}
            </Button>
          ) : null}
        </section>
      ) : null}

      <section>
        <SectionLabel className="mb-3">Avisos</SectionLabel>
        <InboxList />
      </section>
    </div>
  );
}
