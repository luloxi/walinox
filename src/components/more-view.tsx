"use client";

import Link from "next/link";
import { History, Package, ScanLine, Ticket, Users } from "lucide-react";

const ITEMS = [
  { href: "/contacts", label: "Contactos", hint: "Agenda e historial", icon: Users },
  { href: "/products", label: "Productos", hint: "Vales NFT en USDT", icon: Package },
  { href: "/vales", label: "Mis vales", hint: "Para canjear el bien", icon: Ticket },
  { href: "/vales/redeem", label: "Canjear", hint: "Comercio: escanear vale", icon: ScanLine },
  { href: "/summary", label: "Actividad", hint: "Todo el movimiento", icon: History },
] as const;

export function MoreView() {
  return (
    <div className="mx-auto w-full max-w-lg pb-6">
      <h2 className="text-lg font-semibold">Negocio</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Contactos, historial por cliente y vales NFT de producto físico.
      </p>
      <ul className="mt-4 space-y-2 pb-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 hover:bg-muted"
              >
                <Icon className="size-5 text-primary" />
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.hint}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
