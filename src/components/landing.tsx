"use client";

import { ChevronDown, QrCode, Store, WifiOff } from "lucide-react";
import { ConnectCta } from "@/components/connect-cta";

function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const STEPS = [
  { n: "1", title: "Firmás el pago", body: "En tu celular, con o sin señal." },
  { n: "2", title: "Se lo pasás al otro", body: "QR, sonido, luz o archivo." },
  { n: "3", title: "Se asienta on-chain", body: "Cuando hay red, el USDT se mueve." },
] as const;

const TETHER = [
  {
    name: "WDK",
    title: "Gas en USDT",
    body: "Enviás online sin juntar ETH. El gas se paga en la misma moneda que movés.",
  },
  {
    name: "QVAC",
    title: "En una frase",
    body: "Completás monto y destino con lenguaje natural. No es un chat: rellena el formulario y listo.",
  },
  {
    name: "Pears",
    title: "Sala offline",
    body: "Cada permiso lleva un topic local. Hoy viaja por QR y canales del teléfono; listo para P2P real.",
  },
] as const;

export function Landing() {
  return (
    <div className="shell-scroll h-dvh overflow-y-auto bg-background">
      <section className="flex min-h-dvh flex-col items-center px-6">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            width={72}
            height={72}
            className="size-16 rounded-full md:size-20"
          />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight md:text-4xl">Walinox</h1>
          <p className="mt-3 max-w-sm text-base leading-snug text-muted-foreground">
            USDT que se firma sin internet y se cobra en la tienda cuando hay red.
          </p>
          <ConnectCta stacked label="Empezar" className="mt-8 max-w-xs" />
          <p className="mt-4 text-[11px] text-muted-foreground">Auto-custodia · Ethereum · USDT</p>
        </div>
        <button
          type="button"
          className="landing-chevron mb-8 inline-flex cursor-pointer flex-col items-center gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => jump("valor")}
        >
          <span className="text-[11px] tracking-wide uppercase">Por qué</span>
          <ChevronDown className="size-5" />
        </button>
      </section>

      <section id="valor" className="mx-auto max-w-lg scroll-mt-6 space-y-4 px-6 pb-10">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <WifiOff className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">Pagás aunque no haya señal</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                En el kiosco, la feria o el bondi el cliente firma el gasto offline. No hace falta Wi‑Fi ni datos en el
                momento del pago.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Store className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">La tienda cobra más fácil</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Armás el pedido, mostrás un QR y el cliente firma. Cuando hay red, publicás el cobro. Más gente puede
                pagar en USDT sin fricción de wallet clásica.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <QrCode className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">La firma viaja; la plata se asienta después</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Separar “autorizar” de “asentar” es el truco: el QR es un cheque firmado, no un wire que exige red al
                instante.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-lg px-6 pb-12">
        <div className="landing-scene mx-auto" aria-hidden="true">
          <span className="landing-node landing-node-you">
            <span className="landing-core" />
          </span>
          <span className="landing-path">
            <span className="landing-track">
              <span className="landing-packet" />
            </span>
          </span>
          <span className="landing-node landing-node-shop">
            <span className="landing-core" />
          </span>
        </div>
        <div className="mx-auto mt-3 flex w-full max-w-xs justify-between text-[11px] text-muted-foreground">
          <span>Cliente</span>
          <span>Tienda</span>
        </div>

        <p className="mt-10 text-sm font-medium tracking-[0.14em] text-muted-foreground uppercase">Cómo funciona</p>
        <ol className="mt-4 grid gap-3">
          {STEPS.map((step) => (
            <li key={step.n} className="flex gap-3 rounded-2xl border border-border/80 px-4 py-3">
              <span className="font-mono text-sm text-primary">{step.n}</span>
              <span>
                <span className="block text-sm font-medium">{step.title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-lg px-6 pb-12">
        <p className="text-sm font-medium tracking-[0.14em] text-muted-foreground uppercase">Stack Tether</p>
        <p className="mt-2 text-sm text-muted-foreground">
          No es marketing de whitepaper: cada pieza cambia algo que tocás en el día a día.
        </p>
        <ul className="mt-5 space-y-3">
          {TETHER.map((item) => (
            <li key={item.name} className="rounded-2xl border border-border bg-card/80 px-4 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{item.title}</p>
                <span className="font-mono text-[11px] tracking-wide text-primary">{item.name}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-lg px-6 pb-24">
        <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 to-card px-5 py-6 text-center">
          <p className="text-base font-medium">Listo para el mostrador y para el P2P</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Claves en tu teléfono. Saldo en USDT. Cobro cuando hay red.
          </p>
          <ConnectCta stacked label="Conectar billetera" className="mx-auto mt-6 max-w-xs" />
        </div>
      </section>
    </div>
  );
}
