"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PermitCard } from "@/components/permit-card";
import { EtherscanTxLink } from "@/components/etherscan-link";
import { SaveContact } from "@/components/save-contact";
import { usePaymentChain } from "@/components/use-payment-chain";
import { useWallet } from "@/components/wallet-provider";
import { listenSound, readBluetooth, readNfc } from "@/lib/air-io";
import type { Channel } from "@/lib/channels";
import { decodeCharge } from "@/lib/charge";
import { shortAddress } from "@/lib/format";
import { decodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import {
  broadcastPermit,
  encodePermitCall,
  validatePermitSignature,
  type PermitTypedData,
} from "@/lib/permit";
import {
  buildPermit2,
  settlePermit2Envelope,
  validatePermit2Signature,
} from "@/lib/permit2";
import { receiptFromPermit } from "@/lib/receipts";
import { tokenByAddress } from "@/lib/tokens";
import { cn } from "@/lib/utils";

const QrScanner = dynamic(() => import("@/components/qr-scanner").then((m) => m.QrScanner), {
  ssr: false,
});

type Result = {
  envelope: SignedEnvelope;
  valid: boolean;
  reason?: string;
};

function ingest(raw: string, channel: Channel): Result {
  if (decodeCharge(raw)) throw new Error("Eso es el pedido. Esperá la firma del otro.");
  const envelope = decodeEnvelope(raw);
  const check =
    envelope.kind === "permit2"
      ? validatePermit2Signature(
          buildPermit2({
            token: envelope.token,
            spender: envelope.spender,
            amount: envelope.value,
            nonce: String(envelope.typedData.message.nonce ?? ""),
            deadline: String(envelope.typedData.message.deadline ?? ""),
            chainId: envelope.typedData.domain.chainId,
          }),
          envelope.signature,
          envelope.owner,
        )
      : validatePermitSignature(
          envelope.typedData as unknown as PermitTypedData,
          envelope.signature,
        );
  receiptFromPermit(
    {
      owner: envelope.owner,
      spender: envelope.spender,
      value: envelope.value,
      token: envelope.token,
    },
    {
      action: "received",
      channel,
      signature: envelope.signature,
      valid: check.ok,
      digest: check.digest,
    },
  );
  return {
    envelope,
    valid: check.ok,
    reason: check.ok ? undefined : check.reason,
  };
}

export function CollectSigned({ expectedSpender }: { expectedSpender?: string }) {
  const { wallet } = useWallet();
  const { ensure } = usePaymentChain();
  const [scanning, setScanning] = useState(false);
  const [listening, setListening] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const listenAbort = useRef<AbortController | null>(null);

  useEffect(() => () => listenAbort.current?.abort(), []);

  function take(raw: string, channel: Channel) {
    try {
      const next = ingest(raw, channel);
      if (
        expectedSpender &&
        next.envelope.spender.toLowerCase() !== expectedSpender.toLowerCase()
      ) {
        throw new Error("Esa firma no es para esta address");
      }
      setResult(next);
      setError(null);
      setScanning(false);
      setListening(false);
      listenAbort.current?.abort();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payload inválido");
    }
  }

  async function onListen() {
    if (listening) {
      listenAbort.current?.abort();
      return;
    }
    setListening(true);
    setScanning(false);
    setError(null);
    const ac = new AbortController();
    listenAbort.current = ac;
    try {
      take(await listenSound({ signal: ac.signal }), "ultrasonic");
    } catch (err) {
      if (!ac.signal.aborted) setError(err instanceof Error ? err.message : "No se oyó nada");
    } finally {
      setListening(false);
      listenAbort.current = null;
    }
  }

  const envelope = result?.envelope;
  const tokenLabel = envelope
    ? `${tokenByAddress(envelope.token)?.symbol ?? envelope.token} · ${envelope.kind}`
    : "";

  if (result && envelope) {
    return (
      <div className="space-y-3">
        <p className={result.valid ? "text-sm font-medium text-primary" : "text-sm font-medium text-destructive"}>
          {result.valid
            ? `Firma válida · ${shortAddress(envelope.owner)}`
            : `Firma inválida${result.reason ? `: ${result.reason}` : ""}`}
        </p>
        <PermitCard
          kind={envelope.kind}
          owner={envelope.owner}
          spender={envelope.spender}
          value={envelope.value}
          tokenLabel={tokenLabel}
          nonce={String(envelope.typedData.message.nonce ?? "")}
          deadline={String(envelope.typedData.message.deadline ?? "")}
          chainId={envelope.typedData.domain.chainId}
        />
        {result.valid ? (
          <div className="space-y-2">
            {envelope.kind === "permit2" ? (
              <Button
                type="button"
                className="h-11 w-full"
                disabled={!wallet}
                onClick={() => {
                  if (!wallet) return;
                  void ensure()
                    .then(() => settlePermit2Envelope(envelope, (to, data) => wallet.sendCalldata(to, data)))
                    .then(setTx)
                    .catch((err: unknown) =>
                      setError(err instanceof Error ? err.message : "Falló el cobro"),
                    );
                }}
              >
                Confirmar cobro
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  className="h-11 w-full"
                  disabled={!wallet}
                  onClick={() => {
                    if (!wallet) return;
                    void ensure()
                      .then(() =>
                        broadcastPermit(
                          envelope.typedData as unknown as PermitTypedData,
                          envelope.signature,
                          (to, data) => wallet.sendCalldata(to, data),
                        ),
                      )
                      .then(setTx)
                      .catch((err: unknown) =>
                        setError(err instanceof Error ? err.message : "Falló el cobro"),
                      );
                  }}
                >
                  Confirmar cobro
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => {
                    const { data } = encodePermitCall(
                      envelope.typedData as unknown as PermitTypedData,
                      envelope.signature,
                    );
                    void navigator.clipboard.writeText(data);
                    setTx("calldata copiado");
                  }}
                >
                  Copiar calldata
                </Button>
              </>
            )}
          </div>
        ) : null}
        {tx ? (
          <div className="space-y-1">
            <p className="break-all font-mono text-[11px] text-muted-foreground">{tx}</p>
            <EtherscanTxLink hash={tx} className="text-xs" />
          </div>
        ) : null}
        {result.valid && wallet?.address.toLowerCase() !== envelope.owner.toLowerCase() ? (
          <SaveContact address={envelope.owner} hint="Te mandó este permiso" />
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={() => {
            setResult(null);
            setTx(null);
            setError(null);
          }}
        >
          Leer otra firma
        </Button>
        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <QrScanner
        active={scanning}
        onResult={(text) => take(text, "qr")}
        onError={(message) => {
          setError(message);
          setScanning(false);
        }}
      />
      <Button
        type="button"
        className="h-11 w-full"
        onClick={() => {
          listenAbort.current?.abort();
          setScanning((value) => !value);
        }}
      >
        {scanning ? "Parar cámara" : "Leer QR / luz"}
      </Button>
      <div className="grid grid-cols-3 gap-2">
        <Button type="button" variant="outline" className="h-11" onClick={() => void onListen()}>
          {listening ? "Parar" : "Sonido"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => {
            setScanning(false);
            listenAbort.current?.abort();
            void readBluetooth()
              .then((raw) => take(raw, "ble"))
              .catch((err: unknown) =>
                setError(err instanceof Error ? err.message : "Bluetooth falló"),
              );
          }}
        >
          Bluetooth
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => {
            setScanning(false);
            listenAbort.current?.abort();
            void readNfc()
              .then((raw) => take(raw, "nfc"))
              .catch((err: unknown) =>
                setError(err instanceof Error ? err.message : "NFC falló"),
              );
          }}
        >
          NFC
        </Button>
      </div>
      <button
        type="button"
        className="flex h-9 w-full cursor-pointer items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setAdvanced((value) => !value)}
      >
        Pegar o archivo
        <ChevronDown className={cn("size-3.5 transition-transform", advanced && "rotate-180")} />
      </button>
      {advanced ? (
        <div className="space-y-2 rounded-2xl border border-dashed border-border p-3">
          <Textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={2}
            placeholder="Pegá la firma JSON"
            className="font-mono text-xs"
          />
          <Button type="button" variant="outline" className="h-11 w-full" onClick={() => take(pasted, "copy")}>
            Validar texto
          </Button>
          <Input
            type="file"
            accept="application/json,.json"
            className="cursor-pointer text-xs"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void file.text().then((text) => take(text, "file"));
            }}
          />
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
