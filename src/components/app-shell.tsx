"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, PenLine, ScanLine } from "lucide-react";
import { shortAddress } from "@/lib/format";
import { useWallet } from "@/components/wallet-provider";

const NAV = [
  { href: "/", label: "Create", icon: PenLine },
  { href: "/receive", label: "Receive", icon: ScanLine },
  { href: "/summary", label: "Summary", icon: CalendarRange },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { wallet, error } = useWallet();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 pb-32 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-[0.22em] text-teal-400/80 uppercase">
            Sovereign Relay Agent
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Walinox
          </h1>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-muted-foreground">
          {wallet ? shortAddress(wallet.address) : error ? "no wallet" : "…"}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0c1110]/90 backdrop-blur">
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
