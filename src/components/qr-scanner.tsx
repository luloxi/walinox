"use client";

import { useEffect, useRef } from "react";
import jsQR from "jsqr";
import { createOpticalAssembler, unpackAir } from "@/lib/air";

function scanFrame(ctx: CanvasRenderingContext2D, image: ImageData): string | null {
  const opts = { inversionAttempts: "attemptBoth" as const };
  const full = jsQR(image.data, image.width, image.height, opts);
  if (full?.data) return full.data;
  const side = Math.min(image.width, image.height);
  if (side < 80) return null;
  const x = Math.floor((image.width - side) / 2);
  const y = Math.floor((image.height - side) / 2);
  const crop = ctx.getImageData(x, y, side, side);
  const center = jsQR(crop.data, crop.width, crop.height, opts);
  return center?.data ?? null;
}

export function QrScanner({
  active,
  onResult,
  onError,
}: {
  active: boolean;
  onResult: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastRef = useRef("");
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  useEffect(() => {
    if (!active) {
      lastRef.current = "";
      return;
    }
    let stream: MediaStream | null = null;
    let frame = 0;
    const canvas = document.createElement("canvas");
    const opticalCanvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const opticalCtx = opticalCanvas.getContext("2d", { willReadFrequently: true });
    const optical = createOpticalAssembler();

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
          if (!video || !ctx || !opticalCtx || video.readyState < 2) {
            frame = requestAnimationFrame(tick);
            return;
          }
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const found = scanFrame(ctx, image);
          if (found && found !== lastRef.current) {
            lastRef.current = found;
            onResultRef.current(found);
            frame = requestAnimationFrame(tick);
            return;
          }
          const side = 240;
          opticalCanvas.width = side;
          opticalCanvas.height = side;
          opticalCtx.drawImage(video, 0, 0, side, side);
          const small = opticalCtx.getImageData(0, 0, side, side);
          const packet = optical.push(small);
          if (packet) {
            try {
              const text = unpackAir(packet);
              if (text && text !== lastRef.current) {
                lastRef.current = text;
                onResultRef.current(text);
              }
            } catch {
              /* frame CRC can pass before unwrap; keep listening */
            }
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch (err) {
        onErrorRef.current?.(err instanceof Error ? err.message : "No hay cámara");
      }
    }

    void start();
    return () => {
      cancelAnimationFrame(frame);
      optical.reset();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active]);

  if (!active) return null;

  return (
    <video
      ref={videoRef}
      className="aspect-square w-full rounded-2xl bg-black object-cover"
      muted
      playsInline
    />
  );
}
