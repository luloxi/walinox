"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, History, ScanLine, Settings, Store, Users, Wallet } from "lucide-react";
import { BackLink, nestedBack } from "@/components/back-link";
import { Brand } from "@/components/brand";
import { LoginScreen } from "@/components/login-screen";
import { useWallet } from "@/components/wallet-provider";
import { INBOX_EVENT, unreadCount } from "@/lib/notify";
import { cn } from "@/lib/utils";

const NAV_DESKTOP = [
  { href: "/", label: "Billetera", icon: Wallet },
  { href: "/contacts", label: "Contactos", icon: Users },
  { href: "/tienda", label: "Local", icon: Store },
  { href: "/inbox", label: "Avisos", icon: Bell },
  { href: "/summary", label: "Actividad", icon: History },
  { href: "/settings", label: "Ajustes", icon: Settings },
] as const;

function active(pathname: string, href: string): boolean {
  if (href === "/") {
    return (
      (pathname === "/" || pathname.startsWith("/send") || pathname.startsWith("/receive")) &&
      !pathname.includes("tab=pagar")
    );
  }
  if (href === "/tienda") {
    return pathname.startsWith("/tienda") || pathname.startsWith("/products");
  }
  if (href === "/inbox") return pathname.startsWith("/inbox");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  mobile,
  badge,
}: {
  href: string;
  label: string;
  icon: typeof Wallet;
  pathname: string;
  mobile?: boolean;
  badge?: number;
}) {
  const on = active(pathname, href);
  if (mobile) {
    return (
      <Link
        href={href}
        className={cn(
          "relative flex min-h-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] transition-colors",
          on ? "text-primary" : "text-muted-foreground",
        )}
      >
        <span className="relative">
          <Icon className={cn("size-5", on && "stroke-[2.25]")} />
          {badge && badge > 0 ? (
            <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {badge > 9 ? "9+" : badge}
            </span>
          ) : null}
        </span>
        {label}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        on ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted/70",
      )}
    >
      <Icon className="size-5" />
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, hydrating, needsTos } = useWallet();
  const back = nestedBack(pathname);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    function refresh() {
      setUnread(unreadCount());
    }
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener(INBOX_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(INBOX_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (needsTos) {
    return <LoginScreen />;
  }

  if (hydrating || !ready) {
    return <LoginScreen />;
  }

  const payOn = pathname === "/" && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("tab") === "pagar"
    : false;
  // SSR-safe: also treat search from pathname is empty; client re-renders
  const payActive =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tab") === "pagar"
      : false;

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
        <Brand className="px-2" />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV_DESKTOP.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              pathname={pathname}
              badge={item.href === "/inbox" ? unread : undefined}
            />
          ))}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] md:hidden">
          {back ? <BackLink href={back.href}>{back.label}</BackLink> : <Brand />}
        </header>
        <main className="shell-scroll min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-28 pt-4 md:px-8 md:pb-8 md:pt-6 lg:px-10">
          <div className="min-h-full w-full max-w-none">{children}</div>
        </main>
      </div>

      <MobileNav unread={unread} />
    </div>
  );
}

function MobileNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  const search =
    typeof window !== "undefined" ? window.location.search : "";
  const payOn = pathname === "/" && new URLSearchParams(search).get("tab") === "pagar";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-1 py-1.5">
        <NavLink href="/" label="Billetera" icon={Wallet} pathname={pathname} mobile />
        <NavLink href="/contacts" label="Contactos" icon={Users} pathname={pathname} mobile />
        <Link
          href="/?tab=pagar"
          className="flex -mt-3 cursor-pointer flex-col items-center justify-center gap-0.5"
          aria-label="Pagar"
        >
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-2xl shadow-md transition-transform active:scale-95",
              payOn
                ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                : "bg-emerald-500 text-white shadow-emerald-500/30",
            )}
          >
            <ScanLine className="size-6" strokeWidth={2.25} />
          </span>
          <span className={cn("text-[11px] font-medium", payOn ? "text-primary" : "text-emerald-600 dark:text-emerald-400")}>
            Pagar
          </span>
        </Link>
        <NavLink
          href="/inbox"
          label="Avisos"
          icon={Bell}
          pathname={pathname}
          mobile
          badge={unread}
        />
        <NavLink href="/tienda" label="Local" icon={Store} pathname={pathname} mobile />
      </div>
    </nav>
  );
}
