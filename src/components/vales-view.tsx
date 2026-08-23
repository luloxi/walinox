"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QrScanner } from "@/components/qr-scanner";
import { Price } from "@/components/price";
import { useWallet } from "@/components/wallet-provider";
import { holdVale, isRedeemed, listHeld } from "@/lib/catalog";
import { payloadToDataUrl } from "@/lib/qr";
import { decodeVale, validateVale, type ValeEnvelope } from "@/lib/vale";
import { fromBaseUnits } from "@/lib/format";

export function ValesView({ embedded = false }: { embedded?: boolean }) {
  const { wallet } = useWallet();
  const [held, setHeld] = useState<ValeEnvelope[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHeld(listHeld(wallet?.address));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [wallet?.address]);

  async function show(envelope: ValeEnvelope) {
    setOpen(envelope.tokenId);
    setQr(await payloadToDataUrl(JSON.stringify(envelope)));
  }

  return (
    <div className={embedded ? "" : "mx-auto w-full max-w-lg pb-6"}>
      <Button
        type="button"
        variant="secondary"
        className="h-11 w-full"
        onClick={() => setScanning((value) => !value)}
      >
        {scanning ? "Cerrar cámara" : "Cargar vale (QR)"}
      </Button>
      <div className="mt-3">
        <QrScanner
          active={scanning}
          onResult={(text) => {
            try {
              const envelope = decodeVale(text);
              const check = validateVale(envelope);
              if (!check.ok) throw new Error(check.reason);
              holdVale(envelope);
              setHeld(listHeld(wallet?.address));
              setScanning(false);
              setError(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : "QR inválido");
            }
          }}
          onError={(message) => {
            setError(message);
            setScanning(false);
          }}
        />
      </div>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      <ul className="mt-4 space-y-2 pb-4">
        {held.length === 0 ? (
          <li className="space-y-2 text-sm text-muted-foreground">
            <p>Todavía no tenés vales.</p>
            <Button asChild className="h-11 w-full">
              <Link href="/tienda">Comprar</Link>
            </Button>
          </li>
        ) : (
          held.map((vale) => {
            const done = isRedeemed(vale.tokenId, vale.issuer);
            return (
              <li key={vale.tokenId} className="rounded-2xl border border-border p-4">
                <p className="text-sm font-medium">{vale.title}</p>
                <p className="text-xs text-muted-foreground">{vale.issuerName}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <Price usdt={fromBaseUnits(vale.price)} size="sm" />
                  <span className="text-muted-foreground">· {vale.redemptionPlace}</span>
                </p>
                {done ? (
                  <p className="mt-2 text-xs text-primary">Ya lo usaste.</p>
                ) : (
                  <>
                    <Button
                      type="button"
                      className="mt-3 h-11 w-full"
                      onClick={() => void show(vale)}
                    >
                      Mostrar en el local
                    </Button>
                  </>
                )}
                {open === vale.tokenId && qr ? (
                  <div className="mt-3 overflow-hidden rounded-xl bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr} alt="Tu vale" className="mx-auto h-52 w-52" />
                  </div>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
