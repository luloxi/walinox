"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, QrCode, Send } from "lucide-react";

const NAV = [
  { href: "/", label: "Send", icon: Send, hint: "Create a permission" },
  { href: "/receive", label: "Scan", icon: QrCode, hint: "Read a QR" },
  { href: "/summary", label: "History", icon: History, hint: "Past activity" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 pb-32 pt-5">
      <header className="mb-5">
        <p className="text-[11px] font-medium tracking-[0.22em] text-teal-400/80 uppercase">
          Walinox
        </p>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Let someone spend your tokens — without the internet
        </h1>
      </header>
      <main className="flex-1">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0c1110]/92 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3 px-2 py-2">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg py-2 text-xs ${
                  active ? "text-teal-300" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
