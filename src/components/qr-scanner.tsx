"use client";

import { useEffect, useRef } from "react";
import jsQR from "jsqr";

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
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!active) {
      lastRef.current = "";
      return;
    }
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
          if (code?.data && code.data !== lastRef.current) {
            lastRef.current = code.data;
            onResultRef.current(code.data);
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
