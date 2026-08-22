"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowDownLeft, ArrowUpRight, History, Store, Users, Wallet } from "lucide-react";
import { Brand } from "@/components/brand";

const DESKTOP = [
  { href: "/", label: "Inicio", icon: Wallet },
  { href: "/send", label: "Enviar", icon: ArrowUpRight },
  { href: "/receive", label: "Recibir", icon: ArrowDownLeft },
  { href: "/contacts", label: "Contactos", icon: Users },
  { href: "/tienda", label: "Tienda", icon: Store },
  { href: "/summary", label: "Actividad", icon: History },
] as const;

const MOBILE = DESKTOP;

function active(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/tienda") {
    return (
      pathname.startsWith("/tienda") ||
      pathname.startsWith("/products") ||
      pathname.startsWith("/vales")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  mobile,
}: {
  href: string;
  label: string;
  icon: typeof Wallet;
  pathname: string;
  mobile?: boolean;
}) {
  const on = active(pathname, href);
  if (mobile) {
    return (
      <Link
        href={href}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg py-2 text-[11px] ${
          on ? "text-teal-300" : "text-muted-foreground"
        }`}
      >
        <Icon className="size-5" />
        {label}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
        on ? "bg-white/10 text-teal-300" : "text-muted-foreground hover:bg-white/5"
      }`}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 px-4 py-6 md:flex">
        <Brand className="px-2" />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {DESKTOP.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </nav>
        <div className="mt-4 [&_button]:cursor-pointer">
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="avatar" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 px-4 pt-4 md:hidden">
          <Brand />
          <div className="[&_button]:cursor-pointer">
            <ConnectButton chainStatus="none" showBalance={false} accountStatus="avatar" />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden px-4 pb-24 pt-4 md:px-10 md:pb-8 md:pt-8">
          <div className="h-full min-h-0">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0c1110]/92 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-6 px-1 py-2">
          {MOBILE.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} mobile />
          ))}
        </div>
      </nav>
    </div>
  );
}
