"use client";

import { useEffect, useState } from "react";
import { Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet-provider";
import {
  applyCloudPayload,
  collectCloudPayload,
  lastCloudBackupAt,
  parsePayload,
  payloadDigest,
  rememberCloudBackupAt,
} from "@/lib/backup";
import { pushAuthTypedData } from "@/lib/push-auth";

function formatAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function CloudBackup() {
  const { wallet } = useWallet();
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [busy, setBusy] = useState<"save" | "restore" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [lastAt, setLastAt] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setLastAt(lastCloudBackupAt()), 0);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function signed(action: "backup" | "restore", extra: string) {
    if (!wallet) throw new Error("Conectá una wallet");
    const ts = Date.now();
    const signature = await wallet.signTypedData(pushAuthTypedData(wallet.address, action, ts, extra));
    return { address: wallet.address, ts, signature, extra, action };
  }

  async function saveCopy() {
    if (!wallet) return;
    setBusy("save");
    setNote(null);
    try {
      const payload = collectCloudPayload(wallet.address);
      const extra = payloadDigest(payload);
      const auth = await signed("backup", extra);
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...auth, payload }),
      });
      const data = (await res.json()) as { error?: string; updatedAt?: string };
      if (res.status === 503) throw new Error("La nube no está lista en este entorno");
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      if (data.updatedAt) {
        rememberCloudBackupAt(data.updatedAt);
        setLastAt(data.updatedAt);
      }
      setNote("Copia guardada");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(null);
    }
  }

  async function restoreCopy() {
    if (!wallet) return;
    setBusy("restore");
    setNote(null);
    try {
      const auth = await signed("restore", "");
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auth),
      });
      const data = (await res.json()) as {
        error?: string;
        empty?: boolean;
        payload?: unknown;
        updatedAt?: string;
      };
      if (res.status === 503) throw new Error("La nube no está lista en este entorno");
      if (!res.ok) throw new Error(data.error || "No se pudo restaurar");
      if (data.empty) throw new Error("No hay copia para esta wallet");
      const payload = parsePayload(data.payload);
      if (!payload) throw new Error("Copia inválida");
      applyCloudPayload(wallet.address, payload);
      if (data.updatedAt) {
        rememberCloudBackupAt(data.updatedAt);
        setLastAt(data.updatedAt);
      }
      setNote("Restaurada. Recargá si no ves los cambios.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "No se pudo restaurar");
    } finally {
      setBusy(null);
    }
  }

  const blocked = !wallet || !online || busy !== null;

  return (
    <section className="mt-6 space-y-2">
      <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
        <Cloud className="size-5" strokeWidth={2.25} aria-hidden />
        Copia en la nube
      </p>
      <p className="text-sm text-muted-foreground">
        El día a día vive en este dispositivo. Con internet podés guardar o traer productos, contactos y
        actividad. La seed no sale de acá.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          className="h-11"
          disabled={blocked}
          onClick={() => void saveCopy()}
        >
          {busy === "save" ? "…" : "Guardar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={blocked}
          onClick={() => void restoreCopy()}
        >
          {busy === "restore" ? "…" : "Restaurar"}
        </Button>
      </div>
      {!online ? <p className="text-xs text-muted-foreground">Sin internet</p> : null}
      {lastAt ? <p className="text-xs text-muted-foreground">Última copia · {formatAt(lastAt)}</p> : null}
      {note ? <p className="text-xs text-primary">{note}</p> : null}
    </section>
  );
}
