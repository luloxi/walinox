"use client";

import { Bluetooth, ClipboardCopy, FileDown, MessageSquare, Nfc, QrCode, Sun, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OFFLINE_CHANNELS, type Channel } from "@/lib/channels";
import { cn } from "@/lib/utils";

const ICONS: Record<Exclude<Channel, "online">, typeof QrCode> = {
  qr: QrCode,
  ultrasonic: Volume2,
  optical: Sun,
  ble: Bluetooth,
  nfc: Nfc,
  copy: ClipboardCopy,
  sms: MessageSquare,
  file: FileDown,
};

const LABELS: Record<Exclude<Channel, "online">, string> = {
  qr: "QR",
  ultrasonic: "Sonido",
  optical: "Luz",
  ble: "Bluetooth",
  nfc: "NFC",
  copy: "Copiar",
  sms: "SMS",
  file: "Archivo",
};

export function ChannelRow({
  active,
  busy,
  onPick,
}: {
  active?: Channel | null;
  busy?: boolean;
  onPick: (id: Exclude<Channel, "online">) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {OFFLINE_CHANNELS.map((id) => {
        const Icon = ICONS[id];
        const on = active === id;
        return (
          <button
            key={id}
            type="button"
            disabled={busy}
            onClick={() => onPick(id)}
            className={cn(
              "flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border text-[10px] font-medium transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            <Icon className="size-4" />
            {LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}

export function SoundPlayback({
  playing,
  onReplay,
}: {
  playing: boolean;
  onReplay: () => void;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-border p-3">
      <div className="flex h-10 items-end justify-center gap-1" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <span
            key={i}
            className={cn("w-1.5 rounded-full bg-primary", playing ? "origin-bottom animate-pulse" : "opacity-30")}
            style={{
              height: `${10 + ((i * 7) % 24)}px`,
              animationDelay: `${(i % 6) * 90}ms`,
            }}
          />
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {playing
          ? "Reproduciendo. El permiso está en todo el tono, no al final."
          : "Ese tono entero es el permiso. Si no se oyó, reproducilo de nuevo."}
      </p>
      <Button type="button" variant="outline" className="h-10 w-full" disabled={playing} onClick={onReplay}>
        {playing ? "Sonando…" : "Reproducir de nuevo"}
      </Button>
    </div>
  );
}
