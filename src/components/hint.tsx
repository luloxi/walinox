"use client";

import { CircleHelp } from "lucide-react";

export function Hint({ text }: { text: string }) {
  return (
    <span className="relative ml-1 inline-flex align-middle">
      <button
        type="button"
        className="peer cursor-pointer rounded-full p-0.5 text-muted-foreground hover:text-teal-300"
        aria-label="Ayuda"
      >
        <CircleHelp className="size-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-0 z-40 mt-1 hidden w-56 rounded-xl bg-zinc-950 px-3 py-2 text-left text-xs leading-relaxed text-muted-foreground ring-1 ring-white/15 peer-focus:block peer-hover:block"
      >
        {text}
      </span>
    </span>
  );
}
