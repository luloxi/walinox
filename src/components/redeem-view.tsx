"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrScanner } from "@/components/qr-scanner";
import { useWallet } from "@/components/wallet-provider";
import { isRedeemed, redeemVale } from "@/lib/catalog";
import { receiptFromPermit } from "@/lib/receipts";
import { decodeVale, validateVale, type ValeEnvelope } from "@/lib/vale";
import { fromBaseUnits, shortAddress } from "@/lib/format";

export function RedeemView() {
  const { wallet } = useWallet();
  const [scanning, setScanning] = useState(false);
  const [envelope, setEnvelope] = useState<ValeEnvelope | null>(null);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const check = envelope ? validateVale(envelope) : null;
  const isIssuer =
    wallet && envelope ? wallet.address.toLowerCase() === envelope.issuer.toLowerCase() : false;
  const already = envelope ? isRedeemed(envelope.tokenId, envelope.issuer) : false;

  function ingest(text: string) {
    try {
      const next = decodeVale(text);
      const result = validateVale(next);
      if (!result.ok) throw new Error(result.reason);
      setEnvelope(next);
      setScanning(false);
      setError(null);
      setDone(null);
      setAck(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "QR inválido");
    }
  }

  function redeem() {
    if (!envelope || !wallet) return;
    try {
      if (!isIssuer) throw new Error("Solo el emisor puede canjear este vale");
      if (!ack) throw new Error("Confirmá la entrega del bien físico");
      const record = redeemVale(envelope, "Bien físico entregado");
      receiptFromPermit(
        {
          owner: envelope.issuer,
          spender: envelope.holder,
          value: envelope.price,
          token: "VALE",
        },
        { action: "redeemed", channel: "qr", signature: envelope.signature, valid: true },
      );
      setDone(record.at);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo canjear");
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto">
      <h2 className="text-lg font-semibold">Canjear vale</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        El comercio escanea el NFT, verifica la firma y registra la entrega del producto.
      </p>
      <Button
        type="button"
        className="mt-4 h-11 w-full"
        onClick={() => setScanning((value) => !value)}
      >
        {scanning ? "Parar cámara" : "Escanear vale"}
      </Button>
      <div className="mt-3">
        <QrScanner
          active={scanning}
          onResult={ingest}
          onError={(message) => {
            setError(message);
            setScanning(false);
          }}
        />
      </div>

      {envelope ? (
        <div className="mt-4 space-y-2 rounded-2xl border border-white/10 p-3">
          <p className="text-sm font-medium">{envelope.title}</p>
          <p className="text-xs text-muted-foreground">
            {envelope.issuerName} · {fromBaseUnits(envelope.price)} USDT
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            Holder {shortAddress(envelope.holder)}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{envelope.terms}</p>
          <p className="text-xs text-muted-foreground">Canje: {envelope.redemptionPlace}</p>
          {check && !check.ok ? <p className="text-xs text-red-400">{check.reason}</p> : null}
          {already ? <p className="text-xs text-teal-300">Ya estaba canjeado.</p> : null}
          <label className="flex cursor-pointer items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={ack}
              onChange={(event) => setAck(event.target.checked)}
              className="mt-0.5 size-4 cursor-pointer accent-teal-400"
            />
            Entregué el bien físico y registré el canje (compliance).
          </label>
          <Button
            type="button"
            className="h-11 w-full"
            disabled={!isIssuer || already || Boolean(done) || (check !== null && !check.ok)}
            onClick={redeem}
          >
            Confirmar canje
          </Button>
          {!isIssuer ? (
            <p className="text-xs text-muted-foreground">
              Este vale lo canjea el emisor ({shortAddress(envelope.issuer)}).
            </p>
          ) : null}
        </div>
      ) : null}

      {done ? <p className="mt-3 text-sm text-teal-300">Canje registrado {new Date(done).toLocaleString()}</p> : null}
      {error ? (
        <Alert className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
