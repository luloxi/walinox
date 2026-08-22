"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  INBOX_EVENT,
  listInbox,
  markInboxRead,
  unreadCount,
  type InboxItem,
} from "@/lib/notify";
import { shortAddress } from "@/lib/format";

export function InboxBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);

  function refresh() {
    setItems(listInbox());
  }

  useEffect(() => {
    const onChange = () => refresh();
    const timer = window.setTimeout(onChange, 0);
    window.addEventListener(INBOX_EVENT, onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(INBOX_EVENT, onChange);
      window.removeEventListener("focus", onChange);
    };
  }, []);

  const unread = unreadCount(items);

  return (
    <>
      <button
        type="button"
        className="relative inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-primary"
        aria-label={unread ? `${unread} avisos sin leer` : "Avisos"}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          refresh();
        }}
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 min-w-4 rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="Avisos"
            className="absolute right-3 bottom-20 left-3 max-h-[70vh] overflow-y-auto rounded-2xl bg-popover p-3 ring-1 ring-border md:right-6 md:bottom-auto md:left-auto md:top-16 md:w-96"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Avisos</p>
              {unread > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    markInboxRead();
                    refresh();
                  }}
                >
                  Marcar leídos
                </Button>
              ) : null}
            </div>
            {items.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Cuando alguien te mande USDT, un vale o un aviso, aparece acá.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.url}
                      className={`block cursor-pointer rounded-xl px-3 py-2 ring-1 ring-border hover:bg-muted ${
                        item.read ? "opacity-70" : "bg-card"
                      }`}
                      onClick={() => {
                        markInboxRead(item.id);
                        setOpen(false);
                      }}
                    >
                      <span className="block text-sm font-medium">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{item.body}</span>
                      <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                        {item.from ? shortAddress(item.from) : ""} ·{" "}
                        {new Date(item.at).toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
