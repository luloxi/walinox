import type { ReactNode } from "react";
import { Hint } from "@/components/hint";

export function SectionBar({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">{children}</div>
      <div className="flex shrink-0 items-center gap-1">
        <p className="text-sm font-medium">{title}</p>
        {hint ? <Hint text={hint} /> : null}
      </div>
    </div>
  );
}
