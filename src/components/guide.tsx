"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "walinox.seenGuide";

export function Guide() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(localStorage.getItem(KEY) !== "1");
  }, []);

  if (!open) return null;

  return (
    <div className="rounded-3xl border border-teal-400/20 bg-teal-400/5 p-5">
      <p className="text-sm font-medium">How this works</p>
      <ol className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">1. Send.</span> Write who can spend
          your tokens, then sign on this phone.
        </li>
        <li>
          <span className="font-medium text-foreground">2. Show the QR</span> to the other
          phone — no internet needed.
        </li>
        <li>
          <span className="font-medium text-foreground">3. Scan</span> on the other phone.
          They submit it on-chain later (that part needs gas).
        </li>
      </ol>
      <Button
        type="button"
        className="mt-4 h-10 w-full cursor-pointer"
        onClick={() => {
          localStorage.setItem(KEY, "1");
          setOpen(false);
        }}
      >
        Got it — let’s go
      </Button>
    </div>
  );
}
