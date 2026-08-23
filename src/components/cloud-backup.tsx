"use client";

import { useEffect, useState } from "react";
import { Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet-provider";
import {
  applyCloudPayload,
  CLOUD_BACKUP_EVENT,
  formatBackupAge,
  lastCloudBackupAt,
  pullCloudBackup,
  pushCloudBackup,
  rememberCloudBackupAt,
} from "@/lib/backup";

export function CloudBackup() {
  const { wallet } = useWallet();
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [busy, setBusy] = useState<"save" | "restore" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [lastAt, setLastAt] = useState<string | null>(null);

  useEffect(() => {
    function refresh() {
      setLastAt(lastCloudBackupAt());
    }
    const timer = window.setTimeout(refresh, 0);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener(CLOUD_BACKUP_EVENT, refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener(CLOUD_BACKUP_EVENT, refresh);
    };
  }, []);

  async function saveNow() {
    if (!wallet) return;
    setBusy("save");
    setNote(null);
    try {
      const result = await pushCloudBackup(wallet.address);
      if (!result.ok) {
        throw new Error(
          result.error === "sin base"
            ? "La nube no está lista en este entorno"
            : result.error === "sin internet"
              ? "Sin internet"
              : "No se pudo guardar",
        );
      }
      setLastAt(result.updatedAt);
      setNote("Copia guardada");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(null);
    }
  }

  async function restoreCopy() {
    if (!wallet) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("¿Restaurar la copia de la nube? Reemplaza productos y contactos de este dispositivo.")
    ) {
      return;
    }
    setBusy("restore");
    setNote(null);
    try {
      const result = await pullCloudBackup(wallet.address);
      if (!result.ok) {
        throw new Error(
          result.empty
            ? "No hay copia para esta wallet"
            : result.error === "sin base"
              ? "La nube no está lista en este entorno"
              : "No se pudo restaurar",
        );
      }
      applyCloudPayload(wallet.address, result.payload);
      rememberCloudBackupAt(result.updatedAt);
      setLastAt(result.updatedAt);
      setNote("Restaurada");
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
        Se guarda sola con internet. La seed no sale de este dispositivo.
      </p>
      <p className="text-xs text-muted-foreground">{formatBackupAge(lastAt)}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" className="h-11" disabled={blocked} onClick={() => void saveNow()}>
          {busy === "save" ? "…" : "Guardar ahora"}
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
      {note ? <p className="text-xs text-primary">{note}</p> : null}
    </section>
  );
}
