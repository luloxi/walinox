import type { ReactNode } from "react";

export function SectionBar({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">{children}</div>
    </div>
  );
}
