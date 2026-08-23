import type { ReactNode } from "react";

export function SectionBar({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <div className="w-full">{children}</div>;
}
