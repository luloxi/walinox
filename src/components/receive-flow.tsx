"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OfflineSend } from "@/components/offline-send";
import { Price } from "@/components/price";
import { UnitToggle } from "@/components/unit-toggle";
import { UsdtLogo } from "@/components/usdt-logo";
import { useDisplay } from "@/components/display-provider";
import { useFx } from "@/components/use-fx";
import { useWallet } from "@/components/wallet-provider";
import { buildCharge, encodeCharge, type ChargeRequest } from "@/lib/charge";
import { fiatMeta, fiatPrefix } from "@/lib/display";
import { fiatToUsdt, formatFiat, formatUsdt, usdtToFiat } from "@/lib/fx";
import { payloadToDataUrl } from "@/lib/qr";
import { SectionBar } from "@/components/section-bar";

export function ReceiveFlow() {
  const { wallet } = useWallet();
  const { prefs } = useDisplay();
  const fx = useFx();
  const [addressQr, setAddressQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askUnit, setAskUnit] = useState<"fiat" | "usdt">(prefs.primary);
  const [askAmountInput, setAskAmountInput] = useState("");
  const [askExactUsdt, setAskExactUsdt] = useState<string | null>(null);
  const [askNote, setAskNote] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askCharge, setAskCharge] = useState<ChargeRequest | null>(null);
  const [askQr, setAskQr] = useState<string | null>(null);

  const askAmount =
    askExactUsdt ??
    (askAmountInput.trim()
      ? askUnit === "usdt"
        ? askAmountInput.trim()
        : fiatToUsdt(askAmountInput, fx.perUsdt)
      : "");

  useEffect(() => {
    if (!wallet) return;
    void payloadToDataUrl(wallet.address).then(setAddressQr);
  }, [wallet]);

  function switchAskUnit(next: "fiat" | "usdt") {
    if (next === askUnit) return;
    const current = askAmount;
    setAskUnit(next);
    if (!current || Number(current) <= 0) {
      setAskAmountInput("");
      setAskExactUsdt(null);
      return;
    }
    setAskExactUsdt(current);
    if (next === "usdt") setAskAmountInput(current);
    else setAskAmountInput(String(Math.round(usdtToFiat(current, fx.perUsdt))));
  }

  async function makeRequest() {
    if (!wallet) return;
    const amount = askAmount.trim();
    if (!amount || Number(amount) <= 0) {
      setError("Monto inválido");
      return;
    }
    setAskBusy(true);
    setError(null);
    try {
      const note = askNote.trim() || "Pedido";
      const next = buildCharge({
        to: wallet.address,
        store: note,
        items: [{ productId: "request", title: note, price: amount, qty: 1 }],
      });
      setAskCharge(next);
      setAskQr(await payloadToDataUrl(encodeCharge(next)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo armar el pedido");
    } finally {
      setAskBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg pb-6">
      <div className="space-y-3 pb-2 md:space-y-4">
        <Tabs defaultValue="me">
          <SectionBar>
            <TabsList>
              <TabsTrigger value="me" className="cursor-pointer">
                Address
              </TabsTrigger>
              <TabsTrigger value="pedir" className="cursor-pointer">
                Pedir
              </TabsTrigger>
            </TabsList>
          </SectionBar>

          <TabsContent value="me" className="mt-4 space-y-3">
            {addressQr ? (
              <div className="overflow-hidden rounded-3xl bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={addressQr} alt="Tu address" className="mx-auto h-44 w-44 md:h-48 md:w-48" />
              </div>
            ) : (
              <div className="flex h-44 items-center justify-center rounded-3xl bg-muted text-sm text-muted-foreground md:h-48">
                Generando QR…
              </div>
            )}
            <p className="break-all text-center font-mono text-xs text-muted-foreground">
              {wallet ? wallet.address : "…"}
            </p>
            <Button
              type="button"
              className="h-11 w-full"
              disabled={!wallet}
              onClick={() => {
                if (!wallet) return;
                void navigator.clipboard.writeText(wallet.address).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                });
              }}
            >
              {copied ? "Copiada" : "Copiar address"}
            </Button>
          </TabsContent>

          <TabsContent value="pedir" className="mt-4 space-y-3">
            {askCharge ? (
              <div className="space-y-3">
                <button
                  type="button"
                  className="h-9 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setAskCharge(null);
                    setAskQr(null);
                  }}
                >
                  Cambiar monto
                </button>
                <div className="rounded-2xl border border-border px-4 py-3">
                  <p className="text-[11px] text-muted-foreground">{askCharge.store}</p>
                  <Price usdt={askCharge.amount} size="lg" />
                </div>
                <OfflineSend
                  payload={encodeCharge(askCharge)}
                  qrUrl={askQr}
                  filename="walinox-pedido.json"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Monto</p>
                  <div className="flex h-11 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-inset focus-within:ring-ring/50 dark:bg-input/30">
                    <span className="pl-3 text-sm text-muted-foreground" aria-hidden="true">
                      {askUnit === "fiat" ? fiatPrefix(prefs.fiat) : null}
                      {askUnit === "usdt" ? <UsdtLogo className="size-4" /> : null}
                    </span>
                    <Input
                      inputMode="decimal"
                      value={askAmountInput}
                      onChange={(event) => {
                        setAskExactUsdt(null);
                        setAskAmountInput(event.target.value);
                      }}
                      placeholder="0"
                      className="h-11 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
                      aria-label={
                        askUnit === "usdt" ? "Monto en USDT" : `Monto en ${fiatMeta(prefs.fiat).name}`
                      }
                    />
                    <UnitToggle value={askUnit} fiatLabel={prefs.fiat} onChange={switchAskUnit} className="mr-1" />
                  </div>
                  {askAmount && Number(askAmount) > 0 ? (
                    <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      {askUnit === "fiat" ? (
                        <>
                          {formatUsdt(askAmount, 6)}
                          <UsdtLogo className="size-3" />
                        </>
                      ) : (
                        formatFiat(usdtToFiat(askAmount, fx.perUsdt), prefs.fiat)
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Nota</p>
                  <Input
                    value={askNote}
                    onChange={(event) => setAskNote(event.target.value)}
                    placeholder="Café, alquiler…"
                    className="h-11"
                  />
                </div>
                <Button
                  type="button"
                  className="h-11 w-full"
                  disabled={!wallet || askBusy || !askAmount.trim()}
                  onClick={() => void makeRequest()}
                >
                  {askBusy ? "Armando…" : "Generar pedido"}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
