"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { History, Settings, Store, Users, Wallet } from "lucide-react";
import { Brand } from "@/components/brand";
import { InboxBell } from "@/components/inbox-bell";
import { LoginScreen } from "@/components/login-screen";
import { useWallet } from "@/components/wallet-provider";

const NAV = [
  { href: "/", label: "Billetera", icon: Wallet },
  { href: "/contacts", label: "Contactos", icon: Users },
  { href: "/tienda", label: "Tienda", icon: Store },
  { href: "/summary", label: "Actividad", icon: History },
  { href: "/settings", label: "Ajustes", icon: Settings },
] as const;

function active(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/send") || pathname.startsWith("/receive");
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
          on ? "text-primary" : "text-muted-foreground"
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
        on ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted/70"
      }`}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, hydrating } = useWallet();

  if (hydrating || !ready) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
        <Brand className="px-2" />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </nav>
        <div className="mt-4 flex items-center gap-2 [&_button]:cursor-pointer">
          <InboxBell />
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="avatar" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 px-4 pt-4 md:hidden">
          <Brand />
          <div className="flex items-center gap-1 [&_button]:cursor-pointer">
            <InboxBell />
            <ConnectButton chainStatus="none" showBalance={false} accountStatus="avatar" />
          </div>
        </header>
        <main className="shell-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-4 md:px-8 md:pb-8 md:pt-6 lg:px-10">
          <div className="min-h-full w-full">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 px-1 py-2">
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} mobile />
          ))}
        </div>
      </nav>
    </div>
  );
}
