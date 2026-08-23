"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PermitCard } from "@/components/permit-card";
import { PayCharge } from "@/components/pay-charge";
import { SaveContact } from "@/components/save-contact";
import { EtherscanTxLink } from "@/components/etherscan-link";
import { usePaymentChain } from "@/components/use-payment-chain";
import { useWallet } from "@/components/wallet-provider";
import { listenSound, readBluetooth } from "@/lib/air-io";
import type { Channel } from "@/lib/channels";
import { decodeCharge, type ChargeRequest } from "@/lib/charge";
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
  encodePermit2TransferFrom,
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
  recovered?: string;
};

function ingest(raw: string, channel: Channel): Result {
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
    recovered: check.recovered,
  };
}

export function PayFlow() {
  const { wallet } = useWallet();
  const { ensure } = usePaymentChain();
  const [pasted, setPasted] = useState("");
  const [scanning, setScanning] = useState(true);
  const [listening, setListening] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listenAbort = useRef<AbortController | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [charge, setCharge] = useState<ChargeRequest | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  useEffect(() => {
    return () => listenAbort.current?.abort();
  }, []);

  function takePayload(raw: string, channel: Channel) {
    try {
      const nextCharge = decodeCharge(raw);
      if (nextCharge) {
        setCharge(nextCharge);
        setResult(null);
      } else {
        setCharge(null);
        setResult(ingest(raw, channel));
      }
      setError(null);
      setScanning(false);
      setListening(false);
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
      const raw = await listenSound({ signal: ac.signal });
      takePayload(raw, "ultrasonic");
    } catch (err) {
      if (!ac.signal.aborted) {
        setError(err instanceof Error ? err.message : "No se oyó nada");
      }
    } finally {
      setListening(false);
      listenAbort.current = null;
    }
  }

  async function onBle() {
    setError(null);
    setScanning(false);
    listenAbort.current?.abort();
    try {
      takePayload(await readBluetooth(), "ble");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bluetooth falló");
    }
  }

  function reset() {
    setCharge(null);
    setResult(null);
    setTx(null);
    setError(null);
    setScanning(true);
  }

  const envelope = result?.envelope;
  const tokenLabel = envelope
    ? `${tokenByAddress(envelope.token)?.symbol ?? envelope.token} · ${envelope.kind}`
    : "";

  return (
    <div className="mx-auto w-full max-w-lg space-y-3 pb-6">
      <div>
        <p className="text-base font-semibold">Pagar</p>
        <p className="text-sm text-muted-foreground">
          Escaneá un QR o usá otro canal para pagar un cobro o confirmar un permiso offline.
        </p>
      </div>

      {charge ? (
        <PayCharge charge={charge} onBack={reset} />
      ) : result && envelope ? (
        <div className="space-y-3">
          <p
            className={
              result.valid
                ? "text-sm font-medium text-primary"
                : "text-sm font-medium text-destructive"
            }
          >
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
            explanation={envelope.explanation}
            complianceNote={envelope.complianceNote}
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
                    const { to, data } = encodePermit2TransferFrom(
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
                    );
                    void ensure()
                      .then(() => wallet.sendCalldata(to, data))
                      .then(setTx)
                      .catch((err: unknown) =>
                        setError(err instanceof Error ? err.message : "Falló el envío"),
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
                          setError(err instanceof Error ? err.message : "Falló el envío"),
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
              {tx ? (
                <div className="space-y-1">
                  <p className="break-all font-mono text-[11px] text-muted-foreground">{tx}</p>
                  <EtherscanTxLink hash={tx} className="text-xs" />
                </div>
              ) : null}
            </div>
          ) : null}
          {result.valid &&
          envelope.owner &&
          wallet?.address.toLowerCase() !== envelope.owner.toLowerCase() ? (
            <SaveContact address={envelope.owner} hint="Te mandó este permiso" />
          ) : null}
          <Button type="button" variant="outline" className="h-11 w-full" onClick={reset}>
            Escanear otro
          </Button>
        </div>
      ) : (
        <>
          <QrScanner
            active={scanning}
            onResult={(text) => takePayload(text, "qr")}
            onError={(message) => {
              setError(message);
              setScanning(false);
            }}
          />
          <Button
            type="button"
            className="h-12 w-full"
            onClick={() => {
              listenAbort.current?.abort();
              setScanning((value) => !value);
            }}
          >
            {scanning ? "Parar cámara" : "Escanear QR"}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => void onListen()}>
              {listening ? "Parar sonido" : "Sonido"}
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => void onBle()}>
              Bluetooth
            </Button>
          </div>

          <button
            type="button"
            className="flex h-9 w-full cursor-pointer items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMore((value) => !value)}
          >
            Más canales
            <ChevronDown className={cn("size-3.5 transition-transform", more && "rotate-180")} />
          </button>

          {more ? (
            <div className="space-y-2 rounded-2xl border border-border p-3">
              <Textarea
                value={pasted}
                onChange={(event) => setPasted(event.target.value)}
                rows={2}
                placeholder="Pegá el JSON del cobro"
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={() => {
                  try {
                    const nextCharge = decodeCharge(pasted);
                    if (nextCharge) {
                      setCharge(nextCharge);
                      setResult(null);
                    } else {
                      setCharge(null);
                      setResult(ingest(pasted, "copy"));
                    }
                    setError(null);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "JSON inválido");
                  }
                }}
              >
                Validar texto
              </Button>
              <Input
                type="file"
                accept="application/json,.json"
                className="cursor-pointer text-xs"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void file.text().then((text) => {
                    try {
                      const nextCharge = decodeCharge(text);
                      if (nextCharge) {
                        setCharge(nextCharge);
                        setResult(null);
                      } else {
                        setCharge(null);
                        setResult(ingest(text, "file"));
                      }
                      setError(null);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Archivo inválido");
                    }
                  });
                }}
              />
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Link
        href="/?tab=ingresar"
        className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 transition-colors hover:bg-muted"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Plus className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">¿Sin saldo?</span>
          <span className="block text-xs text-muted-foreground">Ingresá fondos para poder pagar</span>
        </span>
      </Link>
    </div>
  );
}
