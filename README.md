# Walinox

**Pagás en USDT aunque no haya señal.**

El comprador firma en el celular sin internet. El que cobra asienta on-chain cuando vuelve la red. Plata en dólares digitales, claves en tu dispositivo, pensado para kioscos, ferias y el día a día en LATAM.

Demo: [walinox-nu.vercel.app](https://walinox-nu.vercel.app)

---

### En un ascensor

Walinox es una PWA de **USDT auto-custodia** donde el pago no depende de que el comprador tenga datos. Firmás offline (QR, NFC, Bluetooth, sonido…); el settlement es Permit2 en Ethereum. Sirve para mandar entre personas y para que un local arme la caja, liste productos y cobre sin que la red del cliente sea un requisito.

### MVP

- **P2P / B2B** — enviar, recibir, pedir, pagar.
- **B2C / Tienda** — catálogo del vendedor, caja (POS) y cobro por todos los canales offline.

Saldo en USDT con referencia en moneda local (cotización de mercado). Firmar no mueve tokens: el USDT se mueve cuando alguien ejecuta la firma. USDT mainnet no tiene `permit()`; usamos Uniswap Permit2.

Diferido (vitrina pública, vales, reporte mensual): [`docs/roadmap.md`](docs/roadmap.md).

## Por qué existe

En Argentina y buena parte de LATAM la señal es irregular y el efectivo duele. Las stablecoins ayudan, pero casi todas las wallets asumen internet permanente y una curva técnica alta.

Walinox apuesta a lo contrario: **firmar ahora, asentar después**, auto-custodia real, UI en español y una tienda usable en el mostrador. Inclusión financiera práctica, no otra app de trading.

## Qué hay hoy

- **Login** — RainbowKit o billetera local WDK + términos EIP-712.
- **Billetera** — saldo, Ingresar / Recibir / Enviar / Pagar.
- **Tienda** — productos, caja, canales offline.
- **Contactos** — agenda mínima.
- **Actividad** — historial local.
- **Ajustes** — moneda, seguridad (PIN/biometría), push, tema.

## USDT y Permit2

USDT (`0xdAC17F958D2ee523a2206206994597C13D831ec7`) no implementa ERC-2612 `permit()`. Walinox firma Uniswap **Permit2**:

1. Una vez: `approve(Permit2)`.
2. Cada gasto offline: EIP-712 `PermitTransferFrom`.
3. El receptor llama `permitTransferFrom`. Ahí se mueve el token.

## Sin internet

Viaja un JSON firmado (`SignedEnvelope`) o un pedido (`ChargeRequest`).

| Canal | Uso |
| --- | --- |
| QR | Camino principal |
| Copiar / archivo | Listo |
| NFC / sonido / luz / BLE | En `OfflineSend` / `ChannelRow` |

Después del primer load (PWA) el comprador puede pagar en modo avión.

## WDK, QVAC y Pears

**WDK** — billetera local no-custodial (`@tetherto/wdk` + `wdk-wallet-evm`). Seed en el dispositivo. Online: gasless 7702 en USDT; si falla, EOA con ETH.

**QVAC** — atajo “En una frase” para completar formularios. Modelo Qwen3 0.6B Instruct Q4 (`qvac.config.json` → `/api/agent`). Sin QVAC, heurística local.

**Pears** — envelopes offline con invite + topic (preparado para sala P2P). Sin runtime Pear en la PWA todavía.

## Install

Node 22.17+.

```bash
npm install
npm test
npm run build
npm start
```

## Env

Ver [`docs/env.md`](docs/env.md). VAPID privada solo en el server.

## Límites

- Seed local cifrada con PIN (sin recovery de cloud de la frase).
- Push durable en Vercel necesita store durable en producción.
- Candide público está rate-limited.

Más: [`docs/mentores.md`](docs/mentores.md), [`docs/roadmap.md`](docs/roadmap.md), [`database.md`](database.md).
