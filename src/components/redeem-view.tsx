"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrScanner } from "@/components/qr-scanner";
import { useWallet } from "@/components/wallet-provider";
import { isRedeemed, redeemVale } from "@/lib/catalog";
import { Price } from "@/components/price";
import { fromBaseUnits } from "@/lib/format";
import { notifyPeer } from "@/lib/notify";
import { receiptFromPermit } from "@/lib/receipts";
import { decodeVale, validateVale, type ValeEnvelope } from "@/lib/vale";

export function RedeemView({ embedded = false }: { embedded?: boolean }) {
  const { wallet } = useWallet();
  const [scanning, setScanning] = useState(false);
  const [envelope, setEnvelope] = useState<ValeEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const check = envelope ? validateVale(envelope) : null;
  const isSeller =
    wallet && envelope ? wallet.address.toLowerCase() === envelope.issuer.toLowerCase() : false;
  const already = envelope ? isRedeemed(envelope.tokenId, envelope.issuer) : false;
  const canRedeem = Boolean(envelope && check?.ok && !already && !done && (isSeller || envelope.demo));

  function ingest(text: string) {
    try {
      const next = decodeVale(text);
      const result = validateVale(next);
      if (!result.ok) throw new Error(result.reason);
      setEnvelope(next);
      setScanning(false);
      setError(null);
      setDone(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "QR inválido");
    }
  }

  function redeem() {
    if (!envelope) return;
    try {
      if (!canRedeem) throw new Error("Este vale no se puede canjear acá");
      redeemVale(envelope, "Entregado");
      receiptFromPermit(
        {
          owner: envelope.issuer,
          spender: envelope.holder,
          value: envelope.price,
          token: "VALE",
        },
        { action: "redeemed", channel: "qr", signature: envelope.signature, valid: true },
      );
      void notifyPeer({
        kind: "redeemed",
        from: envelope.issuer,
        to: envelope.holder,
        amount: fromBaseUnits(envelope.price),
        token: "USDT",
        url: "/vales",
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo canjear");
    }
  }

  return (
    <div className={embedded ? "space-y-3" : "mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto"}>
      <Button type="button" className="h-12 w-full" onClick={() => setScanning((value) => !value)}>
        {scanning ? "Cerrar cámara" : "Escanear vale del cliente"}
      </Button>
      <QrScanner
        active={scanning}
        onResult={ingest}
        onError={(message) => {
          setError(message);
          setScanning(false);
        }}
      />

      {envelope ? (
        <div className="space-y-2 rounded-2xl border border-border p-4">
          <p className="text-sm font-medium">{envelope.title}</p>
          <p className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Price usdt={fromBaseUnits(envelope.price)} size="sm" />
              <span>· {envelope.redemptionPlace}</span>
            </span>
          </p>
          {already || done ? (
            <p className="text-sm text-primary">Entregado.</p>
          ) : (
            <Button type="button" className="h-12 w-full" disabled={!canRedeem} onClick={redeem}>
              Entregar producto
            </Button>
          )}
        </div>
      ) : null}

      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
