# Walinox

PWA de **USDT en Ethereum** auto-custodia. **MVP:** pagos **sin internet del lado del comprador** (B2B y B2C).

- **P2P / B2B:** enviar, recibir, pedir, escanear.
- **B2C / Local:** el vendedor lista productos, arma la caja y cobra; el comprador firma offline por QR, NFC, Bluetooth, sonido, luz, archivo o copiar. El asiento on-chain puede esperar red de quien cobra.

Saldo en pesos (dólar blue). Las claves las tiene el usuario. Firmar no mueve tokens: el USDT se asienta cuando alguien ejecuta la firma (Permit2). USDT mainnet **no tiene** `permit()`.

Demo: [walinox-nu.vercel.app](https://walinox-nu.vercel.app) · repo `luloxi/walinox`.

Diferido (vitrina pública, vales, reporte mensual): [`docs/roadmap.md`](docs/roadmap.md).

## Qué hay hoy (MVP)

- **Login** — RainbowKit o billetera local WDK + términos EIP-712.
- **Billetera** — saldo, Ingresar / Recibir / Enviar / Pagar.
- **Local** — productos del vendedor, caja (POS), cobro con todos los canales offline.
- **Contactos** — agenda mínima.
- **Actividad** — historial local (sin reportes automáticos).
- **Ajustes** — moneda, wallet, seguridad (PIN/biometría), avisos push, tema.

## USDT y Permit2

USDT (`0xdAC17F958D2ee523a2206206994597C13D831ec7`) no implementa ERC-2612 `permit()`. Walinox firma Uniswap **Permit2**:

1. Una vez: `approve(Permit2)`.
2. Cada gasto offline: EIP-712 `PermitTransferFrom`.
3. El receptor llama `permitTransferFrom`. Ahí se mueve el token.

## Sin internet

El objeto que viaja es un JSON firmado (`SignedEnvelope`) o un pedido (`ChargeRequest`).

| Canal | Uso |
| --- | --- |
| QR | Camino principal. |
| Copiar / archivo | Funciona. |
| NFC / sonido / luz / BLE | En `OfflineSend` / `ChannelRow`. |

Después del primer load (PWA) el QR puede usarse en modo avión del comprador.

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
