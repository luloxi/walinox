"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { allChannelStatuses, type Channel } from "@/lib/channels";

export function OfflineSend({
  payload,
  qrUrl,
  filename,
  onSent,
}: {
  payload: string;
  qrUrl: string | null;
  filename?: string;
  onSent?: (channel: Channel) => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [optical, setOptical] = useState(false);
  const statuses = allChannelStatuses().filter((channel) => channel.id !== "online");

  async function send(channel: Channel) {
    setNote(null);
    try {
      if (channel === "qr") {
        setNote("Mostrale este QR al otro celular.");
        onSent?.("qr");
        return;
      }
      if (channel === "copy") {
        await navigator.clipboard.writeText(payload);
        setNote("Copiado.");
        onSent?.("copy");
        return;
      }
      if (channel === "file") {
        const blob = new Blob([payload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename ?? "walinox.json";
        a.click();
        URL.revokeObjectURL(url);
        setNote("Archivo descargado.");
        onSent?.("file");
        return;
      }
      if (channel === "ble") {
        const bluetooth = (navigator as Navigator & {
          bluetooth?: { requestDevice: (opts: { acceptAllDevices: boolean }) => Promise<unknown> };
        }).bluetooth;
        if (!bluetooth) throw new Error("Bluetooth no está en este navegador");
        await bluetooth.requestDevice({ acceptAllDevices: true });
        setNote("Se abrió el picker. El peer GATT todavía no cierra el loop.");
        onSent?.("ble");
        return;
      }
      if (channel === "nfc") {
        const NDEF = (window as Window & { NDEFReader?: new () => { write: (data: unknown) => Promise<void> } })
          .NDEFReader;
        if (!NDEF) throw new Error("NFC no está en este navegador");
        await new NDEF().write({ records: [{ recordType: "text", data: payload }] });
        setNote("Escrito en el tag NFC.");
        onSent?.("nfc");
        return;
      }
      if (channel === "ultrasonic") {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) throw new Error("Audio no está en este navegador");
        const ctx = new Ctx();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.frequency.value = 18000;
        gain.gain.value = 0.04;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.6);
        setNote("Sonido enviado. Si no llega, usá QR.");
        onSent?.("ultrasonic");
        return;
      }
      if (channel === "optical") {
        setOptical(true);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setOptical(false);
        setNote("Pantalla destelló. Completá con QR si hace falta.");
        onSent?.("optical");
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "No se pudo enviar");
    }
  }

  return (
    <div className="space-y-3">
      {qrUrl ? (
        <div className="overflow-hidden rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="Payload" className="mx-auto h-52 w-52" />
        </div>
      ) : (
        <div className="flex h-52 items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
          Armando QR…
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {statuses.map((channel) => (
          <Button
            key={channel.id}
            type="button"
            variant={channel.id === "qr" ? "default" : "outline"}
            className="h-11 justify-between"
            disabled={!channel.available && channel.id !== "qr"}
            onClick={() => void send(channel.id)}
          >
            {channel.label}
            {!channel.available ? <Badge variant="secondary">n/a</Badge> : null}
          </Button>
        ))}
      </div>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      {optical ? <div className="pointer-events-none fixed inset-0 z-50 animate-pulse bg-white" /> : null}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        El cliente no necesita internet. QR, copiar y archivo cierran el loop. Bluetooth, NFC, sonido y luz si el teléfono los tiene.
      </p>
    </div>
  );
}
