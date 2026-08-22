"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PermitCard } from "@/components/permit-card";
import { useWallet } from "@/components/wallet-provider";
import { decodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import { broadcastPermit, encodePermitCall, validatePermitSignature, type PermitTypedData } from "@/lib/permit";
import {
  buildPermit2,
  encodePermit2TransferFrom,
  validatePermit2Signature,
} from "@/lib/permit2";
import { sendCall } from "@/lib/chain";
import { receiptFromPermit } from "@/lib/receipts";
import { tokenByAddress } from "@/lib/tokens";
import { payloadToDataUrl } from "@/lib/qr";
import { shortAddress } from "@/lib/format";
import type { Channel } from "@/lib/channels";

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

export function ReceiveFlow() {
  const { wallet } = useWallet();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [addressQr, setAddressQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) return;
    void payloadToDataUrl(wallet.address).then(setAddressQr);
  }, [wallet]);

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let frame = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const tick = () => {
          const video = videoRef.current;
          if (!video || !ctx || video.readyState < 2) {
            frame = requestAnimationFrame(tick);
            return;
          }
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(image.data, image.width, image.height);
          if (code?.data) {
            try {
              setResult(ingest(code.data, "qr"));
              setScanning(false);
              setError(null);
              return;
            } catch (err) {
              setError(err instanceof Error ? err.message : "QR inválido");
            }
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No hay cámara");
        setScanning(false);
      }
    }

    void start();
    return () => {
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scanning]);

  const envelope = result?.envelope;
  const tokenLabel = envelope
    ? `${tokenByAddress(envelope.token)?.symbol ?? envelope.token} · ${envelope.kind}`
    : "";

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto">
    <div className="space-y-5 pb-4">
      <div>
        <h2 className="text-lg font-semibold">Recibir</h2>
        <p className="text-xs text-muted-foreground">
          Mostrá tu address o escaneá un permiso offline.
        </p>
      </div>

      <Tabs defaultValue="me">
        <TabsList className="w-full">
          <TabsTrigger value="me" className="flex-1 cursor-pointer">
            Mi address
          </TabsTrigger>
          <TabsTrigger value="scan" className="flex-1 cursor-pointer">
            Escanear permiso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="me" className="mt-4 space-y-3">
          {addressQr ? (
            <div className="overflow-hidden rounded-3xl bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={addressQr} alt="Tu address" className="mx-auto h-56 w-56" />
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center rounded-3xl bg-white/5 text-sm text-muted-foreground">
              Generando QR…
            </div>
          )}
          <p className="break-all text-center font-mono text-xs text-muted-foreground">
            {wallet ? wallet.address : "…"}
          </p>
          <Button
            type="button"
            className="h-11 w-full"
            disabled={!wallet}
            onClick={() => {
              if (!wallet) return;
              void navigator.clipboard.writeText(wallet.address).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              });
            }}
          >
            {copied ? "Address copiada" : "Copiar address"}
          </Button>
        </TabsContent>

        <TabsContent value="scan" className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Si te mandaron un permiso sin internet, escaneá el QR o pegá el JSON.
          </p>
          {result && envelope ? (
            <div className="space-y-3">
              <p className={result.valid ? "text-sm text-teal-300" : "text-sm text-red-400"}>
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
                      onClick={() => {
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
                        void sendCall(to, data)
                          .then(setTx)
                          .catch((err: unknown) =>
                            setError(err instanceof Error ? err.message : "Falló el envío"),
                          );
                      }}
                    >
                      Enviar por Permit2
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        className="h-11 w-full"
                        onClick={() => {
                          void broadcastPermit(
                            envelope.typedData as unknown as PermitTypedData,
                            envelope.signature,
                          )
                            .then(setTx)
                            .catch((err: unknown) =>
                              setError(err instanceof Error ? err.message : "Falló el envío"),
                            );
                        }}
                      >
                        Enviar permit()
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
                    <p className="break-all font-mono text-[11px] text-muted-foreground">{tx}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <video
            ref={videoRef}
            className="aspect-square w-full rounded-2xl bg-black object-cover"
            muted
            playsInline
          />
          <Button type="button" className="h-11 w-full" onClick={() => setScanning((value) => !value)}>
            {scanning ? "Parar cámara" : "Escanear QR"}
          </Button>
          <Textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={3}
            placeholder="O pegá el JSON acá"
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => {
              try {
                setResult(ingest(pasted, "copy"));
                setError(null);
              } catch (err) {
                setError(err instanceof Error ? err.message : "JSON inválido");
              }
            }}
          >
            Validar JSON
          </Button>
          <Input
            type="file"
            accept="application/json,.json"
            className="cursor-pointer"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void file.text().then((text) => {
                try {
                  setResult(ingest(text, "file"));
                  setError(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Archivo inválido");
                }
              });
            }}
          />
        </TabsContent>
      </Tabs>

      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
    </div>
  );
}
