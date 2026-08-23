# Walinox

PWA de **USDT en Ethereum** auto-custodia. **MVP:** pagos **sin internet del lado del comprador** (B2B / B2C) — firmar offline, pasar la firma (QR u otro canal), asentar on-chain cuando hay red.

Saldo en pesos (dólar blue). Las claves las tiene el usuario. Firmar no mueve tokens: el USDT se asienta cuando alguien ejecuta la firma (Permit2). USDT mainnet **no tiene** `permit()`.

Demo: [walinox-nu.vercel.app](https://walinox-nu.vercel.app) · repo `luloxi/walinox`.

Features diferidas (tienda online por wallet, resumen mensual automatizado, etc.): [`docs/roadmap.md`](docs/roadmap.md).

## Qué hay hoy (MVP)

- **Login** — RainbowKit o billetera local WDK + términos EIP-712.
- **Billetera** — saldo, Recibir / Pagar / Enviar.
- **Enviar** — online (ERC-20, gas USDT vía WDK 7702) u offline (Permit2 + canales).
- **Recibir** — address, pedir monto, escanear/validar firma y confirmar cobro.
- **Contactos** — agenda mínima.
- **Actividad** — historial local de movimientos (sin reportes automáticos).
- **Ajustes** — moneda, wallet, avisos push, tema.

## USDT y Permit2

USDT (`0xdAC17F958D2ee523a2206206994597C13D831ec7`) no implementa ERC-2612 `permit()`. Walinox firma Uniswap **Permit2**:

1. Una vez: `approve(Permit2)`.
2. Cada gasto offline: EIP-712 `PermitTransferFrom`.
3. El receptor llama `permitTransferFrom`. Ahí se mueve el token.

## Envío sin internet

El objeto que viaja es un JSON firmado (`SignedEnvelope`).

| Canal | Estado |
| --- | --- |
| QR | Camino principal. |
| Copiar / archivo | Funciona. |
| Sonido / luz / BLE / NFC | Experimentales; ver código. |

Después del primer load (PWA) el QR puede usarse en modo avión.

## Gas (WDK 7702)

`@tetherto/wdk-wallet-evm-7702-gasless` paga al bundler en **USDT**. Si falla, fallback EOA (pide ETH).

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

- Seed local cifrada con PIN en el dispositivo (sin recovery de cloud).
- Push durable en Vercel necesita store durable en producción.
- Candide público está rate-limited.

Más: [`docs/mentores.md`](docs/mentores.md), [`docs/roadmap.md`](docs/roadmap.md).
