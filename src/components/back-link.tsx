import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg px-1 text-sm text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <ChevronLeft className="size-5" />
      {children}
    </Link>
  );
}

export function nestedBack(pathname: string): { href: string; label: string } | null {
  if (pathname.startsWith("/contacts/") && pathname !== "/contacts") {
    return { href: "/contacts", label: "Contactos" };
  }
  if (pathname.startsWith("/tienda/") && pathname !== "/tienda") {
    return { href: "/tienda", label: "Tienda" };
  }
  if (pathname.startsWith("/products/")) return { href: "/tienda", label: "Tienda" };
  if (pathname.startsWith("/vales")) return { href: "/tienda", label: "Tienda" };
  return null;
}
