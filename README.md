# Walinox

**Pagás en USDT aunque no haya señal.**

El comprador firma en el celular sin internet. El que cobra asienta on-chain cuando vuelve la red. Plata en dólares digitales, claves en tu dispositivo, pensado para kioscos, ferias y el día a día en LATAM.

Demo: [walinox-nu.vercel.app](https://walinox-nu.vercel.app)

Guion para grabar: [`docs/demo.md`](docs/demo.md) · Roadmap: [`docs/roadmap.md`](docs/roadmap.md)

---

## ¿Qué es?

Una PWA de **USDT auto-custodia** en Ethereum. El pago no depende de que el comprador tenga datos: firmás offline (QR, NFC, Bluetooth, sonido, luz, archivo o copiar) y el settlement usa Uniswap **Permit2**. Sirve para mandar entre personas y para que un local arme la caja, liste productos y cobre sin que la red del cliente sea un requisito.

## ¿Cómo funciona?

1. El comprador **autoriza** un gasto (firma EIP-712 Permit2), con o sin internet.
2. Pasa esa firma al que cobra por un canal del teléfono.
3. Quien cobra, **con red**, ejecuta `permitTransferFrom` y el USDT se mueve on-chain.

Firmar no mueve tokens. USDT mainnet no tiene `permit()` (ERC-2612); por eso usamos Permit2.

| Canal | Rol |
| --- | --- |
| QR | Camino principal |
| Copiar / archivo | Siempre disponible |
| NFC / sonido / luz / BLE | En `OfflineSend` / `ChannelRow` |

Después del primer load (PWA) el comprador puede pagar en modo avión.

## ¿Por qué existe?

En Argentina y buena parte de LATAM la señal es irregular y el efectivo duele. Las stablecoins ayudan, pero casi todas las wallets asumen internet permanente y una curva técnica alta.

Walinox apuesta a **firmar ahora, asentar después**, auto-custodia real, UI en español y una tienda usable en el mostrador. Inclusión financiera práctica, no otra app de trading.

## ¿Qué hay hoy (MVP)?

- **P2P / B2B** — enviar, recibir, pedir, pagar.
- **B2C / Tienda** — catálogo del vendedor, caja (POS) y cobro por canales offline.

Pantallas:

- **Login** — RainbowKit o billetera local WDK + términos EIP-712.
- **Billetera** — saldo, Ingresar / Recibir / Enviar / Pagar.
- **Tienda** — pestañas Cobrar (default) y Catálogo.
- **Contactos** — agenda mínima.
- **Avisos** — notificaciones in-app (+ push si hay VAPID).
- **Actividad** — historial local.
- **Ajustes** — moneda, seguridad (PIN/biometría), tema, backup de seed (wallet local).

Saldo en USDT con referencia en moneda local (cotización de mercado). Lo diferido (vitrina pública, vales, reporte mensual, off-ramp ARS): [`docs/roadmap.md`](docs/roadmap.md).

## ¿Cómo se mueve el USDT?

USDT (`0xdAC17F958D2ee523a2206206994597C13D831ec7`):

1. Una vez: `approve(Permit2)`.
2. Cada gasto offline: EIP-712 `PermitTransferFrom`.
3. El receptor llama `permitTransferFrom`. Ahí se mueve el token.

Online, la wallet conectada puede transferir directo; WDK intenta gas en USDT (7702 gasless) y si falla usa EOA con ETH.

## ¿Qué trae del stack Tether?

**WDK** — billetera local no-custodial (`@tetherto/wdk` + `wdk-wallet-evm`). Seed en el dispositivo, cifrada con PIN.

**QVAC** — atajo “En una frase” para completar formularios (enviar, contactos, productos). Modelo Qwen3 0.6B Instruct Q4 vía `/api/agent`. Sin QVAC, heurística local.

**Pears** — envelopes offline con invite + topic (preparado para sala P2P). Sin runtime Pear en la PWA todavía.

## ¿Cómo lo corro?

Node 22.17+.

```bash
npm install
npm test
npm run build
npm start
```

Variables: [`docs/env.md`](docs/env.md). Entrada de usuario: [`docs/billetera.md`](docs/billetera.md). Backup multi-dispositivo: [`database.md`](database.md).

## ¿Cuáles son los límites del MVP?

- Seed local cifrada con PIN (sin recovery de cloud de la frase).
- Push durable en Vercel necesita store durable en producción.
- Candide público está rate-limited.
- On-ramp MoonPay necesita `NEXT_PUBLIC_MOONPAY_API_KEY`; el off-ramp ARS es roadmap.

Más contexto para mentores: [`docs/mentores.md`](docs/mentores.md).
