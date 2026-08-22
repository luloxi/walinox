import type { ReactNode } from "react";
import { Hint } from "@/components/hint";

export function SectionBar({
  hint,
  children,
}: {
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">{children}</div>
      {hint ? <Hint text={hint} /> : null}
    </div>
  );
}
