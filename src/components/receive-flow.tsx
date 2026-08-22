"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PermitCard } from "@/components/permit-card";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pasted, setPasted] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [tx, setTx] = useState<string | null>(null);

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
              setError(err instanceof Error ? err.message : "Invalid QR payload");
            }
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Camera unavailable");
        setScanning(false);
      }
    }

    void start();
    return () => {
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scanning]);

  function fromPaste() {
    try {
      setResult(ingest(pasted, "copy"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid payload");
    }
  }

  async function fromFile(file: File) {
    try {
      setResult(ingest(await file.text(), "file"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid file");
    }
  }

  const envelope = result?.envelope;
  const tokenLabel = envelope
    ? `${tokenByAddress(envelope.token)?.symbol ?? envelope.token} · ${envelope.kind}`
    : "";

  return (
    <div className="space-y-5">
      {result && envelope ? (
        <div className="space-y-3">
          <p className={result.valid ? "text-sm text-teal-300" : "text-sm text-red-400"}>
            {result.valid
              ? `Signature valid · owner ${envelope.owner.slice(0, 8)}…`
              : `Invalid signature${result.reason ? `: ${result.reason}` : ""}`}
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
                <>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    USDT has no <span className="font-mono">permit()</span>. Owner must have
                    approved Permit2 once. This call is Permit2.permitTransferFrom — spender
                    submits, USDT moves.
                  </p>
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
                          setError(err instanceof Error ? err.message : "Broadcast failed"),
                        );
                    }}
                  >
                    Submit via Permit2
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    EIP-712 signed this Permit. ERC-2612 permit() sets allowance. Tokens move on
                    transferFrom.
                  </p>
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
                          setError(err instanceof Error ? err.message : "Broadcast failed"),
                        );
                    }}
                  >
                    Submit permit()
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
                      setTx("calldata copied");
                    }}
                  >
                    Copy permit() calldata
                  </Button>
                </>
              )}
              {tx ? (
                <p className="font-mono text-[11px] break-all text-muted-foreground">{tx}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <Tabs defaultValue="qr">
        <TabsList className="w-full">
          <TabsTrigger value="qr" className="flex-1 cursor-pointer">
            Scan QR
          </TabsTrigger>
          <TabsTrigger value="paste" className="flex-1 cursor-pointer">
            Paste
          </TabsTrigger>
          <TabsTrigger value="file" className="flex-1 cursor-pointer">
            File
          </TabsTrigger>
        </TabsList>
        <TabsContent value="qr" className="space-y-3">
          <video
            ref={videoRef}
            className="aspect-square w-full rounded-2xl bg-black object-cover"
            muted
            playsInline
          />
          <Button
            type="button"
            className="h-11 w-full"
            onClick={() => setScanning((value) => !value)}
          >
            {scanning ? "Stop camera" : "Scan QR"}
          </Button>
        </TabsContent>
        <TabsContent value="paste" className="space-y-3">
          <Textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={5}
            placeholder="Paste the signed permit JSON"
            className="font-mono text-xs"
          />
          <Button type="button" className="h-11 w-full" onClick={fromPaste}>
            Validate payload
          </Button>
        </TabsContent>
        <TabsContent value="file" className="space-y-3">
          <Input
            type="file"
            accept="application/json,.json"
            className="cursor-pointer"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void fromFile(file);
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
  );
}
