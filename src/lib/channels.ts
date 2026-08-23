export const CHANNELS = [
  "online",
  "qr",
  "ultrasonic",
  "optical",
  "ble",
  "nfc",
  "copy",
  "sms",
  "file",
] as const;

export type Channel = (typeof CHANNELS)[number];

/** Primary first: QR / copy / file; advanced after. */
export const OFFLINE_CHANNELS = [
  "qr",
  "ultrasonic",
  "optical",
  "ble",
  "nfc",
  "copy",
  "sms",
  "file",
] as const satisfies readonly Exclude<Channel, "online">[];

export type ChannelStatus = {
  id: Channel;
  label: string;
  description: string;
  available: boolean;
  reason?: string;
};

const LABELS: Record<Channel, { label: string; description: string }> = {
  online: { label: "On-chain", description: "Transfer ERC-20. Gas en USDT vía WDK 7702." },
  qr: { label: "QR", description: "Mostrá o escaneá. El camino principal sin internet." },
  ble: { label: "Bluetooth", description: "Archivo por Nearby/AirDrop, o GATT si hay un peer Walinox." },
  nfc: { label: "NFC", description: "Web NFC. Android Chrome." },
  ultrasonic: { label: "Sonido", description: "El permiso viaja en audio. El otro celular escucha." },
  optical: { label: "Luz", description: "La pantalla transmite; la cámara del otro lee." },
  copy: { label: "Copiar", description: "Copiá el JSON al portapapeles." },
  sms: { label: "SMS", description: "Abrí Mensajes con el JSON listo para mandar." },
  file: { label: "Archivo", description: "Descargá o importá un .json." },
};

export function channelStatus(id: Channel): ChannelStatus {
  const meta = LABELS[id];
  if (typeof navigator === "undefined") {
    const available = id === "qr" || id === "copy" || id === "file";
    return {
      id,
      ...meta,
      available,
      reason: available ? undefined : "Needs a browser",
    };
  }

  switch (id) {
    case "ble":
      return {
        id,
        ...meta,
        available: "bluetooth" in navigator,
        reason: "bluetooth" in navigator ? undefined : "Este navegador no tiene Bluetooth",
      };
    case "nfc":
      return {
        id,
        ...meta,
        available: "NDEFReader" in window,
        reason: "NDEFReader" in window ? undefined : "Este navegador no tiene NFC",
      };
    case "ultrasonic":
      return {
        id,
        ...meta,
        available: typeof AudioContext !== "undefined" || typeof window.webkitAudioContext !== "undefined",
        reason: undefined,
      };
    default:
      return { id, ...meta, available: true };
  }
}

export function allChannelStatuses(): ChannelStatus[] {
  return CHANNELS.map(channelStatus);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
