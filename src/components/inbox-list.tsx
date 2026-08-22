"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  INBOX_EVENT,
  listInbox,
  markInboxRead,
  unreadCount,
  type InboxItem,
} from "@/lib/notify";
import { shortAddress } from "@/lib/format";

export function InboxList() {
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
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm">{unread > 0 ? `${unread} sin leer` : "Bandeja"}</p>
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
        <p className="mt-2 text-sm text-muted-foreground">Cuando te manden USDT, un vale o un aviso, aparece acá.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.url}
                className={`block cursor-pointer rounded-xl px-3 py-2 ring-1 ring-border hover:bg-muted ${
                  item.read ? "opacity-70" : "bg-card"
                }`}
                onClick={() => markInboxRead(item.id)}
              >
                <span className="block text-sm font-medium">{item.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{item.body}</span>
                <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                  {item.from ? shortAddress(item.from) : ""} · {new Date(item.at).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
