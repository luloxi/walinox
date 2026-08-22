"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, History, Wallet } from "lucide-react";

const NAV = [
  { href: "/", label: "Inicio", icon: Wallet },
  { href: "/send", label: "Enviar", icon: ArrowUpRight },
  { href: "/receive", label: "Recibir", icon: ArrowDownLeft },
  { href: "/summary", label: "Actividad", icon: History },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 pb-32 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight">Walinox</p>
        <p className="text-[11px] text-muted-foreground">USDT · Ethereum</p>
      </header>
      <main className="flex-1">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0c1110]/92 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4 px-1 py-2">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg py-2 text-[11px] ${
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
