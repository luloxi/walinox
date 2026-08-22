"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CircleHelp, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard may be blocked */
    }
  }

  return (
    <>
      <button
        type="button"
        className="ml-0.5 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-primary/80 hover:bg-muted hover:text-primary"
        aria-label="Ayuda"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <CircleHelp className="size-4" />
      </button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
              onClick={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Ayuda"
                className="w-full max-w-md rounded-3xl bg-popover p-6 ring-1 ring-border"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="select-text text-sm leading-relaxed whitespace-pre-wrap">
                  {text}
                </p>
                <div className="mt-5 flex gap-2">
                  <Button type="button" variant="outline" className="h-10 flex-1" onClick={() => void copy()}>
                    {copied ? (
                      <>
                        <Check />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy />
                        Copiar
                      </>
                    )}
                  </Button>
                  <Button type="button" className="h-10 flex-1" onClick={() => setOpen(false)}>
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
