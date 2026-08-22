"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, History, Wallet } from "lucide-react";
import { Brand } from "@/components/brand";

const NAV = [
  { href: "/", label: "Inicio", icon: Wallet },
  { href: "/send", label: "Enviar", icon: ArrowUpRight },
  { href: "/receive", label: "Recibir", icon: ArrowDownLeft },
  { href: "/summary", label: "Actividad", icon: History },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 px-4 py-6 md:flex">
        <Brand className="px-2" />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                  active ? "bg-white/10 text-teal-300" : "text-muted-foreground hover:bg-white/5"
                }`}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center px-4 pt-4 md:hidden">
          <Brand />
        </header>
        <main className="min-h-0 flex-1 overflow-hidden px-4 pb-24 pt-4 md:px-10 md:pb-8 md:pt-8">
          <div className="h-full min-h-0">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0c1110]/92 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 px-1 py-2">
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
