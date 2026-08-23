# Roadmap — fuera del MVP actual

**MVP (agosto 2026):** pagos sin internet del lado del **comprador**, para **B2B y B2C**.

Flujo núcleo: armar cobro (monto o productos) → el comprador firma **sin red** → se pasa la firma por **QR / NFC / Bluetooth / sonido / luz / archivo / copiar** → el vendedor (o quien cobra) asienta on-chain cuando hay internet.

---

## MVP in scope

- Wallet local o externa (intermediario).
- **Billetera:** enviar online/offline, recibir, pedir, pagar (escanear pedido/firma).
- **Tienda (vendedor B2C):** listar productos, caja (POS), cobrar con **todos los canales offline** (`OfflineSend` / `ChannelRow`).
- Contactos mínimos.
- Actividad local de movimientos (sin reportes automáticos).
- Ajustes: moneda, wallet, avisos push, tema, copia en la nube (opcional, cuando hay internet).
- **Ingresar fondos:** on-ramp fiat → USDT vía MoonPay (ARS por defecto en `onramp.ts` si hay `NEXT_PUBLIC_MOONPAY_API_KEY`). Es **compra de USDT**, no pagar un comercio “en pesos on-chain”.

## Quitado del MVP (sigue en roadmap)

### Tienda online / vitrina pública por wallet

- **Qué era:** marketplace comprador, link público `/tienda/[id]`, compartir vitrina, browse de tiendas ajenas, vales como producto aparte y canje de vales.
- **Por qué fuera:** no es el cobro offline en el mostrador. Es vitrina web, no el núcleo B2C de “cobrar sin red del comprador”.
- **Qué SÍ quedó en MVP:** **Tienda** — catálogo propio del vendedor + POS + canales offline.
- **Estado:** fuera de la UI principal. Código puede quedar en el repo.

### Resumen / reporte automatizado

- **Qué era:** resumen mensual por push/inbox, prompt en Actividad, toggle en Ajustes.
- **Por qué fuera:** no ayuda al pago offline.
- **Estado:** fuera de Ajustes y sin prompt. **Actividad** manual sigue.

## Ciclo ARS ↔ USDT (inclusión completa)

Cerrar el loop pesos ↔ USDT es lo que convierte a Walinox en app de uso diario en Argentina, no solo wallet crypto.

### Hoy

- UI muestra saldos y montos en **ARS (referencia)** con cotización de mercado USDT.
- **On-ramp:** botón **Ingresar** → MoonPay (fiat → USDT a la address). Con key configurada y ARS como `baseCurrencyCode`.
- **Settlement on-chain:** siempre **USDT**. No existe un token “peso argentino” nativo en el flujo de pago offline.

### Roadmap — on-ramp ARS más profundo

- MoonPay (o el fiat rail de Tether/WDK vigente) con **ARS + métodos locales** (tarjeta, transferencia) bien testeados en producción.
- Mensajes claros: “comprás USDT con pesos”; el gasto sigue siendo USDT.
- Fallbacks si MoonPay no cubre ARS en algún momento: otro rail fiat documentado (sin inventar custodial propio).

### Roadmap — off-ramp USDT → ARS

- **Cash-out** a cuenta bancaria / CVU / billetera ARS (MoonPay sell, o partner local: exchange, PSP, fintech regulada).
- UX en Ajustes o Billetera: “Pasar a pesos” con monto, destino y estado del retiro.
- Compliance: KYC del proveedor, límites, tiempos de liquidación. Walinox no custodia el fiat.

### Roadmap — “pagar como en pesos” (sin mentir al ledger)

- Seguir cobrando/asentando en **USDT**.
- UX: el vendedor y el comprador ven y escriben montos en **ARS**; la app convierte al instante con el rate de mercado.
- Opcional: recibo bilingüe “pagaste X ARS ≈ Y USDT”.
- **No** es un stablecoin ARS propio en el MVP; si algún día hay un ARS on-chain confiable y líquido, evaluar como unidad de cuenta, no como reemplazo del núcleo offline-USDT.

### Por qué no es “mega app” todavía

On-ramp + off-ramp + cobro offline cierran inclusión **solo si** el rail fiat es confiable, barato y legal en AR. Eso es producto + partner + compliance, no un sprint de UI. Prioridad post-hackathon: (1) on-ramp ARS usable, (2) off-ramp mínimo, (3) pulir conversión ARS en toda la caja.

## Más adelante (ideas)

- Reactivar vitrina pública / vales / canje.
- Reportes mensuales y analytics.
- P2P más fuerte vía Pears/Hyperswarm.
- Recovery de seed más allá del PIN local.
