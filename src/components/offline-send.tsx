"use client";

import { useState } from "react";
import { ChannelRow, SoundPlayback } from "@/components/channel-row";
import { playSound, transmitChannel } from "@/lib/air-io";
import { type Channel } from "@/lib/channels";

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
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<Exclude<Channel, "online"> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);

  async function replaySound() {
    setPlaying(true);
    setNote(null);
    try {
      await playSound(payload);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "No se pudo enviar");
    } finally {
      setPlaying(false);
    }
  }

  async function send(channel: Exclude<Channel, "online">) {
    setNote(null);
    setActive(channel);
    if (channel !== "ultrasonic") setSoundOpen(false);
    try {
      if (channel === "qr") {
        setNote("Mostrale este QR.");
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
        setBusy(true);
        setSoundOpen(true);
        setPlaying(true);
        await playSound(payload);
        setNote("Sonido enviado. El permiso está en todo el tono.");
        onSent?.("ultrasonic");
        return;
      }
      if (channel === "ble" || channel === "optical") {
        setBusy(true);
        setNote(await transmitChannel(channel, payload));
        onSent?.(channel);
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "No se pudo enviar");
    } finally {
      setBusy(false);
      setPlaying(false);
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
      <ChannelRow active={active} busy={busy || playing} onPick={(id) => void send(id)} />
      {soundOpen ? <SoundPlayback playing={playing} onReplay={() => void replaySound()} /> : null}
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
