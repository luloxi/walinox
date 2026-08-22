"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectCta } from "@/components/connect-cta";

function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const USES = [
  {
    title: "Dólares que son tuyos",
    body: "El saldo es USDT de Tether. Lo ves en pesos. Las claves quedan en tu teléfono: no es un banco ni un exchange.",
  },
  {
    title: "Pagar aunque no haya señal",
    body: "En el kiosco, la feria o el bondi, el cliente firma sin internet. El local confirma el cobro cuando hay red. Así más gente puede usar plata digital.",
  },
  {
    title: "Mandar como te quede cómodo",
    body: "Online si hay conexión. Si no, QR, sonido, luz, copiar, archivo, Bluetooth o NFC.",
  },
  {
    title: "Tu tienda y tu caja",
    body: "Publicás lo que vendés, compartís un link o un QR, y cobrás en el local con el pedido armado. El precio se ve en pesos.",
  },
  {
    title: "Qué pasó, mes a mes",
    body: "Actividad on-chain y un resumen del mes. Cada movimiento muestra los pesos al dólar blue de ese día.",
  },
] as const;

export function Landing() {
  return (
    <div className="shell-scroll h-dvh overflow-y-auto bg-background">
      <section className="flex h-dvh flex-col items-center px-6">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            width={88}
            height={88}
            className="size-20 rounded-2xl md:size-24"
          />
          <p className="mt-6 text-3xl font-semibold tracking-[0.2em] uppercase md:text-4xl">Walinox</p>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">
            Plata que viaja aunque no haya señal.
          </p>
          <ConnectCta stacked label="Conectar billetera" className="mt-8 max-w-xs" />
        </div>
        <a
          href="#que-es"
          className="landing-chevron mb-8 inline-flex cursor-pointer flex-col items-center gap-1 text-muted-foreground hover:text-foreground"
          onClick={(event) => {
            event.preventDefault();
            jump("que-es");
          }}
        >
          <span className="text-[11px] tracking-wide uppercase">Qué es</span>
          <ChevronDown className="size-5" />
        </a>
      </section>

      <section id="que-es" className="mx-auto flex max-w-lg scroll-mt-6 flex-col items-center px-6 py-20">
        <div className="landing-scene" aria-hidden="true">
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
        <div className="mt-5 flex w-full max-w-xs justify-between text-[11px] text-muted-foreground">
          <span>Vos</span>
          <span>El local</span>
        </div>
        <p className="mt-10 text-xl font-semibold">Una billetera para el día a día</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Walinox acerca los dólares digitales a quien cobra y paga en la calle. Firmás en el teléfono; la red se usa
          cuando hace falta. Acceso a USDT, sin pedir permiso a un banco.
        </p>
      </section>

      <section className="mx-auto max-w-lg px-6 pb-16">
        <p className="text-sm font-medium tracking-[0.16em] text-muted-foreground uppercase">Para qué sirve</p>
        <ul className="mt-4 space-y-5">
          {USES.map((item) => (
            <li key={item.title}>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
        <Button asChild variant="outline" className="mt-12 h-11 w-full">
          <a
            href="#tecnica"
            onClick={(event) => {
              event.preventDefault();
              jump("tecnica");
            }}
          >
            Detalle técnico
          </a>
        </Button>
      </section>

      <section
        id="tecnica"
        className="mx-auto min-h-[85dvh] max-w-lg scroll-mt-6 space-y-3 border-t border-border px-6 pt-16 pb-24 text-sm leading-relaxed text-muted-foreground"
      >
        <p className="text-sm font-medium text-foreground">Cómo se asienta</p>
        <p>
          Firmar no mueve la plata. Mueve cuando alguien, con internet, publica esa firma en Ethereum. En el kiosco el
          cliente puede estar sin red; el local no.
        </p>
        <p>
          El saldo se muestra en pesos (dólar blue). El cobro es USDT de Tether. El gas de un envío online también se
          puede pagar en USDT.
        </p>
        <p>
          QR, sonido y luz cierran el loop entre dos celulares. Bluetooth manda el archivo (Nearby / AirDrop) o escribe
          GATT. Nada de eso reemplaza que alguien, al final, suba la transacción a la red.
        </p>
        <p>
          La actividad suma on-chain y lo que firmaste en persona. El peso de cada movimiento usa el blue de ese día, no
          el de ahora.
        </p>
      </section>
    </div>
  );
}
