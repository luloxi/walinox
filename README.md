# Walinox

PWA de **USDT en Ethereum** para el día a día en Argentina: saldo en **pesos** (dólar blue), envíos online o por QR sin internet, contactos, tienda de vales de bienes físicos, avisos y actividad.

Las claves las tiene el usuario. Firmar no mueve tokens: el USDT se asienta on-chain cuando alguien ejecuta la firma (Permit2). USDT mainnet **no tiene** `permit()`.

Demo: [walinox-nu.vercel.app](https://walinox-nu.vercel.app) · repo `luloxi/walinox`.

## Qué hay hoy

- **Login** — sin wallet no hay saldo. Conectar RainbowKit (MetaMask, Rabby, Rainbow, Trust, Ledger, inyectada) o billetera local WDK. Después: términos EIP-712 (una vez) y cómo firmar (cada envío o modo sesión ERC-7715, opcional).
- **Billetera** — saldo en ARS + USDT, address copiable, Depositar / Enviar / Contactos.
- **Enviar** — online (transfer ERC-20, gas en USDT vía WDK 7702) o permiso QR (Permit2). ENS / Basenames. Parser de QR de Binance, MetaMask, EIP-681, etc.
- **Depositar** — QR de tu address o escanear un permiso.
- **Contactos** — agenda (viene `lulox.eth`). Alta por modal. Historial por persona.
- **Tienda**
  - Comprador: productos con foto y precio en pesos; tiendas con su lista; vales.
  - Vendedor: publicados, nuevo producto (foto + precio en $), canjear.
- **Actividad** — sin saldo. Link a Etherscan. Mes / trimestre / año / total. Gráficos ingresos vs gastos y tienda vs personal (en pesos).
- **Avisos** — Web Push + inbox. USDT, vale, ping.
- **QVAC** — destello “¿En una frase?” en enviar / contactos / publicar. Modelo default Qwen3 0.6B. Si no hay modelo, heurística.

## Precios en pesos

Los productos se **cobran en USDT**; la UI muestra **pesos al dólar blue** ([dolarapi.com](https://dolarapi.com/v1/dolares/blue)). El catálogo de demo usa precios de kiosco/panadería/tostaduría en Argentina.

Al publicar, el precio se escribe en pesos y se guarda en USDT.

## USDT y Permit2

USDT (`0xdAC17F958D2ee523a2206206994597C13D831ec7`) no implementa ERC-2612 `permit()`. Walinox firma Uniswap **Permit2** (`0x000000000022D473030F116dDEE9F6B43aC78BA3`):

1. Una vez: `approve(Permit2)`.
2. Cada gasto offline: EIP-712 `PermitTransferFrom`.
3. El receptor llama `permitTransferFrom`. Ahí se mueve el token.

## Envío sin internet

El objeto que viaja es un JSON firmado (`SignedEnvelope`).

| Canal | Estado |
| --- | --- |
| QR | Funciona (demo principal). |
| Copiar / archivo | Funciona. |
| Sonido | FSK audible: el permiso viaja en audio. El otro celular toca Escuchar. |
| Luz | Grilla de color a pantalla completa. El otro escanea con la cámara. |
| Bluetooth | Android/iOS: hoja de compartir (Nearby / AirDrop / Bluetooth). GATT si hay un peer con el servicio Walinox. Un Chrome **no** puede anunciarse como periférico. |
| NFC | Escribe el JSON en un **tag**. No es tap entre dos iPhones. |

Después del primer load (PWA) el QR anda en modo avión.

## Gas (WDK 7702)

No hay “Tether te paga el gas”. El módulo `@tetherto/wdk-wallet-evm-7702-gasless` paga al bundler en **USDT** (Candide público, sin API key). Hace falta un poco extra de USDT. Si el paymaster falla, se intenta una tx EOA (esa pide ETH).

## Tether

- **WDK** — firma local EIP-712.
- **QVAC** — NL → campos. No es un chat. Default `QWEN3_600M_INST_Q4`.
- **Vale** — EIP-712 de un bien físico, no un ERC-721 deployado. El pago sí es USDT on-chain.

## Install

Node 22.17+.

```bash
npm install
npm test
npm run build
npm start
```

http://localhost:3000 — o `npm run dev`.

QVAC opcional: `qvac serve openai` y `QVAC_BASE_URL=http://127.0.0.1:11434/v1 npm start`.

## WalletConnect (403 en localhost)

El project id de ejemplo de RainbowKit (`3fbb6bba6ad1b0da945445a531d15c6b`) **no** autoriza `http://localhost:3000` en Reown Cloud (`api.web3modal.org` → 403). Por defecto Walinox **no carga el conector WalletConnect**; MetaMask / Rabby / inyectada andan igual.

Para QR de WalletConnect (conectar el teléfono sin extensión):

1. Creá un proyecto en [cloud.reown.com](https://cloud.reown.com).
2. Allowlist: `http://localhost:3000` y tu dominio de Vercel.
3. `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...`

## Env opcional

| Variable | Default |
| --- | --- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | vacío (sin conector WC) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | demo en `src/lib/vapid.ts` |
| `VAPID_PRIVATE_KEY` | demo en `src/lib/vapid.ts` |
| `NEXT_PUBLIC_BUNDLER_URL` | Candide public mainnet |
| `NEXT_PUBLIC_RPC_URL` | `https://ethereum-rpc.publicnode.com` |

Ninguna es obligatoria para el demo.

## PWA

HTTPS o localhost. Android: Instalar app. iPhone: Agregar a Inicio. Avisos en iOS 16.4+ solo si está instalada.

## Límites

- QVAC no corre en el browser.
- Seed WDK local está en `localStorage` (no es producción).
- Bluetooth P2P GATT entre dos Chromes no existe (el browser no es periférico); el loop real es Share / sonido / luz.
- Push durable en Vercel hace falta un store (hoy memoria / `.data/`).
- Candide público está rate-limited.
- Localhost: saldo y catálogo de prueba.

Más contexto para mentores: [`docs/mentores.md`](docs/mentores.md).
