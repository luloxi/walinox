"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { payloadToDataUrl } from "@/lib/qr";
import { storeUrl } from "@/lib/store-link";

export function StoreShare({ storeId, title = "Tu tienda online" }: { storeId: string; title?: string }) {
  const [href, setHref] = useState(() => storeUrl(storeId));
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    const next = storeUrl(storeId);
    setHref(next);
    const timer = window.setTimeout(() => {
      void payloadToDataUrl(next).then(setQr);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storeId]);

  async function copy() {
    await navigator.clipboard.writeText(href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="break-all font-mono text-[11px] text-muted-foreground">{href}</p>
      <div className="flex gap-2">
        <Button type="button" className="h-11 flex-1" onClick={() => void copy()}>
          {copied ? (
            <>
              <Check className="size-4" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copiar link
            </>
          )}
        </Button>
        <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setShowQr((value) => !value)}>
          {showQr ? "Ocultar QR" : "QR"}
        </Button>
      </div>
      {showQr && qr ? (
        <div className="overflow-hidden rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Link de tu tienda" className="mx-auto h-44 w-44" />
        </div>
      ) : null}
    </div>
  );
}
