"use client";

import { Brand } from "@/components/brand";
import { ConnectCta } from "@/components/connect-cta";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-8">
        <Brand />
        <ConnectCta />
      </header>
      <main className="shell-scroll min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-6 lg:px-10">
        <div className="min-h-full w-full">{children}</div>
      </main>
    </div>
  );
}
