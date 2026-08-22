"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { QrScanner } from "@/components/qr-scanner";
import { UsdtLogo } from "@/components/usdt-logo";
import { holdVale, listHeld } from "@/lib/catalog";
import { payloadToDataUrl } from "@/lib/qr";
import { decodeVale, validateVale, type ValeEnvelope } from "@/lib/vale";
import { fromBaseUnits, shortAddress } from "@/lib/format";

export function ValesView() {
  const [held, setHeld] = useState<ValeEnvelope[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHeld(listHeld());
  }, []);

  async function show(envelope: ValeEnvelope) {
    setOpen(envelope.tokenId);
    setQr(await payloadToDataUrl(JSON.stringify(envelope)));
  }

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto">
      <h2 className="text-lg font-semibold">Mis vales</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        La posesión del NFT autoriza el canje del producto físico.
      </p>
      <Button
        type="button"
        variant="secondary"
        className="mt-4 h-11 w-full"
        onClick={() => setScanning((value) => !value)}
      >
        {scanning ? "Parar cámara" : "Recibir vale (QR)"}
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
              setHeld(listHeld());
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
          <li className="text-sm text-muted-foreground">No tenés vales todavía.</li>
        ) : (
          held.map((vale) => (
            <li key={vale.tokenId} className="rounded-2xl border border-white/10 p-3">
              <p className="text-sm font-medium">{vale.title}</p>
              <p className="text-xs text-muted-foreground">
                {vale.issuerName} · {vale.redemptionPlace}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs">
                {fromBaseUnits(vale.price)} <UsdtLogo className="size-3.5" />
                <span className="text-muted-foreground">· {shortAddress(vale.holder)}</span>
              </p>
              <Button type="button" variant="outline" className="mt-2 h-9 w-full" onClick={() => void show(vale)}>
                Mostrar QR para canjear
              </Button>
              {open === vale.tokenId && qr ? (
                <div className="mt-2 overflow-hidden rounded-xl bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="QR del vale" className="mx-auto h-40 w-40" />
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
