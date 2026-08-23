# Cómo entra un usuario a Walinox

Walinox es **auto-custodia**: la app no guarda tu plata ni firma por vos en un servidor. Para **mandar, cobrar o comprar** hace falta una billetera Ethereum que firme. Para **mirar una tienda** (el link que comparte un local) no hace falta.

Hay **dos formas** de tener esa billetera. Las dos son una cuenta on-chain de verdad, con USDT en Ethereum.

---

## 1. Conectar una que ya tenés

Botón **Iniciar sesión** / **Conectar billetera**.

Se abre RainbowKit: MetaMask, Rabby, Rainbow, Trust, Ledger, o la extensión que el navegador ya tenga inyectada.

- Las claves **nunca** entran a Walinox: firman en la wallet de siempre.
- Sirve si el usuario ya vive en cripto.
- WalletConnect (QR al teléfono) solo si hay un project id real de Reown; el de ejemplo no anda en localhost.

Después de conectar: una firma de términos (una vez por address) y cómo querés firmar los envíos (cada vez, o modo rápido de sesión si la wallet lo permite).

---

## 2. Billetera local (la que arma Tether WDK)

Botón **Usar billetera local** (a veces se ve como **Local**).

No es un “modo demo” ni una cuenta de Walinox. Es **crear o reabrir una wallet en este navegador** con el SDK de Tether (**WDK**, Wallet Development Kit).

Sí: el SDK tiene API para **generar** una billetera.

En código (`src/lib/wallet.ts`):

1. `WDK.getRandomSeedPhrase(12)` — frase BIP-39 de 12 palabras, si todavía no hay una guardada.
2. Se guarda en `localStorage` bajo `walinox.seed`.
3. `new WDK(seed).registerWallet("ethereum", WalletManagerEvm, { provider })`.
4. `getAccount("ethereum", 0)` — primera cuenta Ethereum. Esa address es la del usuario.
5. Con la misma seed se abre también `@tetherto/wdk-wallet-evm-7702-gasless`: los envíos online pueden pagar el gas **en USDT** (paymaster / bundler), sin pedir ETH. Si el paymaster falla, se intenta una tx EOA clásica (esa sí pide ETH).

La próxima vez que toques **Usar billetera local** en **este** teléfono/navegador, no se crea otra: se reabre la seed que ya está en el dispositivo.

### Qué implica para el usuario

| | Billetera de extensión | Billetera local WDK |
| --- | --- | --- |
| Quién tiene las claves | MetaMask / Rabby / etc. | Este navegador (seed en `localStorage`) |
| ¿Hay que instalar algo? | Sí, una wallet | No |
| Backup | El de esa wallet | **Hay que anotar las 12 palabras.** Si borrás el sitio o el teléfono, se pierde el acceso |
| Firma | Popup de la extensión | En la página, sin extensión |
| Gas online | ETH, o lo que configure la wallet | Intenta USDT vía WDK 7702 |

Hoy la UI **no muestra ni exporta** la seed. Para un producto real habría que: mostrar las 12 palabras al crear, pedir confirmación, y un “restaurar frase”. Mientras tanto, en localhost sirve para entrar al hackathon sin MetaMask.

**No** es un custodial de Tether. Tether no guarda esa seed. WDK corre en el cliente.

---

## Qué se puede hacer sin billetera

- Abrir un link de tienda (`/tienda/tostaduria-sur` o `/tienda/0x…`).
- Ver productos y precios en moneda local.
- Iniciar sesión desde esa misma pantalla si querés comprar.

Sin billetera **no** hay saldo, envíos, caja, actividad ni ajustes.

---

## Flujo completo al entrar

```
Mirar tienda (público)
        │
        ▼
¿Tenés wallet?
   no ──► WDK crea/reabre seed local     sí ──► RainbowKit (MetaMask, …)
        │                                         │
        └──────────────┬──────────────────────────┘
                       ▼
              Firma de términos (EIP-712, una vez)
                       ▼
              Cómo firmás: cada envío  |  modo sesión (opcional)
                       ▼
              App: billetera, contactos, tienda, actividad, ajustes
```

Firmar **no** mueve USDT. El token se mueve cuando esa firma se publica on-chain (online, o el local con internet después de un QR).

---

## Tether, en esta app

- **WDK** (`@tetherto/wdk` + `@tetherto/wdk-wallet-evm`) — crear cuenta, firmar EIP-712, transfer.
- **WDK 7702 gasless** (`@tetherto/wdk-wallet-evm-7702-gasless`) — pagar el bundler en USDT. No es “Tether te regala el gas”.
- **USDT** — lo que se cobra y se muestra (la UI lo traduce a moneda local con cotización USDT de mercado).
- **QVAC** — otra pieza de Tether; entiende una frase (“mandale 10 a Nacho”) y rellena campos. No es la billetera.

Walinox no emite USDT ni reemplaza Tether. Usa su token y su kit de wallets para que un kiosco o una persona pueda **tener dólares digitales sin ser un exchange**.
