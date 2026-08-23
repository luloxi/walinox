"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { transmitChannel } from "@/lib/air-io";
import { allChannelStatuses, type Channel } from "@/lib/channels";

const PRIMARY: Channel[] = ["qr", "copy", "file"];

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
  const [more, setMore] = useState(false);
  const statuses = allChannelStatuses().filter((channel) => channel.id !== "online");
  const primary = statuses.filter((channel) => PRIMARY.includes(channel.id));
  const extra = statuses.filter((channel) => !PRIMARY.includes(channel.id) && channel.available);

  async function send(channel: Channel) {
    setNote(null);
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
      if (channel === "ble" || channel === "ultrasonic" || channel === "optical") {
        setBusy(true);
        setNote(await transmitChannel(channel, payload));
        onSent?.(channel);
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "No se pudo enviar");
    } finally {
      setBusy(false);
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
      <div className="grid grid-cols-3 gap-2">
        {primary.map((channel) => (
          <Button
            key={channel.id}
            type="button"
            variant={channel.id === "qr" ? "default" : "outline"}
            className="h-11"
            disabled={busy}
            onClick={() => void send(channel.id)}
          >
            {channel.label}
          </Button>
        ))}
      </div>
      {extra.length > 0 ? (
        <div className="space-y-2">
          <button
            type="button"
            className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMore((value) => !value)}
          >
            {more ? "Menos canales" : "Más canales"}
          </button>
          {more ? (
            <div className="grid grid-cols-2 gap-2">
              {extra.map((channel) => (
                <Button
                  key={channel.id}
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={busy}
                  onClick={() => void send(channel.id)}
                >
                  {channel.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
