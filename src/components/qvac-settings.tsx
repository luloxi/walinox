"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDeviceQvac } from "@/lib/qvac-device";
import {
  formatQvacMb,
  formatQvacProgress,
  QWEN3_0_6B_Q4_BYTES,
  QWEN3_0_6B_Q4_LABEL,
  type DeviceQvacState,
} from "@/lib/qvac-device-state";

function SectionTitle({ icon: Icon, children }: { icon: typeof Brain; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
      <Icon className="size-5" strokeWidth={2.25} aria-hidden />
      {children}
    </p>
  );
}

function statusLabel(state: DeviceQvacState): string {
  if (state.probing) return "Comprobando runtime…";
  if (state.status === "unsupported") return "Este navegador no puede correrlo";
  if (state.status === "downloading" && state.progress) return `Descargando ${formatQvacProgress(state.progress)}`;
  if (state.status === "downloading") return "Descargando…";
  if (state.status === "ready") return "Listo en este dispositivo";
  return "No instalado";
}

export function QvacSettings() {
  const ctrl = getDeviceQvac();
  const [state, setState] = useState(ctrl.getState());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = ctrl.subscribe(setState);
    void ctrl.probe();
    return unsub;
  }, [ctrl]);

  async function download() {
    setBusy(true);
    try {
      await ctrl.download();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await ctrl.remove();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 space-y-2">
      <SectionTitle icon={Brain}>QVAC</SectionTitle>
      <p className="text-sm">{statusLabel(state)}</p>
      {state.status === "unsupported" ? (
        <p className="text-[11px] text-muted-foreground">{state.error}</p>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">
            {QWEN3_0_6B_Q4_LABEL} ocupa ~{formatQvacMb(QWEN3_0_6B_Q4_BYTES)} MB en disco y varios cientos de MB de RAM.
            Descargalo con Wi‑Fi. Corre en un worker para no congelar la UI.
          </p>
          {state.status === "downloading" && state.progress ? (
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(state.progress.percentage)}
            >
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${Math.max(0, Math.min(100, state.progress.percentage))}%` }}
              />
            </div>
          ) : null}
          {state.error && state.status !== "ready" ? (
            <p className="text-xs text-destructive">{state.error}</p>
          ) : null}
          {state.status === "ready" ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "…" : "Borrar modelo"}
            </Button>
          ) : (
            <Button
              type="button"
              className="h-11 w-full"
              disabled={busy || state.status === "downloading" || state.probing}
              onClick={() => void download()}
            >
              {state.status === "downloading" || busy ? "…" : "Descargar en este dispositivo"}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
