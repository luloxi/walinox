# Walinox

PWA de **USDT en Ethereum** auto-custodia. **MVP:** pagos **sin internet del lado del comprador** (B2B y B2C).

- **P2P / B2B:** enviar, recibir, pedir, escanear.
- **B2C / Local:** el vendedor lista productos, arma la caja y cobra; el comprador firma offline por QR, NFC, Bluetooth, sonido, luz, archivo o copiar. El asiento on-chain puede esperar red de quien cobra.

Saldo en pesos (dólar blue). Las claves las tiene el usuario. Firmar no mueve tokens: el USDT se asienta cuando alguien ejecuta la firma (Permit2). USDT mainnet **no tiene** `permit()`.

Demo: [walinox-nu.vercel.app](https://walinox-nu.vercel.app) · repo `luloxi/walinox`.

Diferido (vitrina pública, vales, reporte mensual): [`docs/roadmap.md`](docs/roadmap.md).

## Impacto social / Financial Inclusion

Walinox está pensado para inclusión financiera real en contextos de alta inflación y conectividad irregular (Argentina / LATAM).

**El problema**  
Millones de personas y comercios chicos operan fuera del sistema bancario tradicional o con señal inestable. El efectivo es riesgoso e ineficiente. Las transferencias bancarias son lentas, caras o inaccesibles. Las stablecoins existen, pero la mayoría de las billeteras exigen internet permanente y fricción técnica que deja afuera al usuario de todos los días.

**Qué hace Walinox**  
- Permite **firmar pagos en USDT offline** (sin señal ni datos en el momento del pago)
- Comercios y personas pueden cobrar en la tienda, kiosco, feria o calle y asentar on-chain después, cuando hay red
- Auto-custodia total: las claves las tiene el usuario
- Pensado para comercio real: modo tienda/POS, contactos, QR y canales offline, referencia en pesos (dólar blue)

**Por qué importa**  
Al sacar la necesidad de internet permanente y simplificar el uso de stablecoins para usuarios no técnicos, Walinox acerca dólares digitales utilizables a personas y negocios que la finanza tradicional y las wallets crypto actuales dejan afuera. Es infraestructura de inclusión, no de especulación.

Alineado con Blockchain for Good: acceso a herramientas financieras digitales, reducción de desigualdad y soluciones blockchain prácticas para actividad económica real en mercados emergentes.

## Qué hay hoy (MVP)

- **Login** — RainbowKit o billetera local WDK + términos EIP-712.
- **Billetera** — saldo, Ingresar / Recibir / Enviar / Pagar.
- **Tienda** — productos del vendedor, caja (POS), cobro con todos los canales offline.
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

## WDK, QVAC y Pears

**WDK** — billetera local no-custodial (`@tetherto/wdk` + `wdk-wallet-evm`). La seed queda en el dispositivo. Envíos online: `@tetherto/wdk-wallet-evm-7702-gasless` paga el bundler en **USDT**; si falla, EOA (esa pide ETH). En el browser, `sodium-native` se aliasa a `sodium-javascript`.

**QVAC** — atajo “¿en una frase?” (enviar, contactos, publicar). No es chat ni la billetera. Modelo: **Qwen3 0.6B Instruct Q4** (`QWEN3_600M_INST_Q4` en `qvac.config.json`). Cabe en celular, habla español y el job es JSON corto. El default del SDK (Llama 3.2 1B) parsea peor “mandale / guardá”. Corre en `qvac serve` → `/api/agent`. Si no hay QVAC, heurística (monto + `0x` / ENS / Basename).

**Pears** — no hay runtime Pear/Hyperswarm en la PWA. Los envelopes offline se envuelven con un invite + topic de 32 bytes (el tamaño de `Hyperswarm.join`) para QR/aire y, más adelante, una sala P2P. Al recibir, si no es wrap, se trata como envelope plano.

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
