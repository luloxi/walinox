# Cómo entra un usuario a Walinox

Walinox es **auto-custodia**: la app no guarda tu plata ni firma por vos en un servidor. Para **mandar, cobrar o pagar** hace falta una billetera Ethereum que firme.

Hay **dos formas** de tener esa billetera. Las dos son una cuenta on-chain de verdad, con USDT en Ethereum.

---

## 1. Conectar una que ya tenés

Botón **Iniciar sesión** / **Conectar billetera**.

Se abre RainbowKit: MetaMask, Rabby, Rainbow, Trust, Ledger, o la extensión que el navegador ya tenga inyectada.

- Las claves **nunca** entran a Walinox: firman en la wallet de siempre.
- WalletConnect (QR al teléfono) solo si hay un project id real de Reown; el de ejemplo no anda en localhost.

Después de conectar: una firma de términos (una vez por address).

---

## 2. Billetera local (Tether WDK)

Botón **Billetera local**.

Crea o reabre una wallet en este navegador con el SDK de Tether (**WDK**).

En código (`src/lib/wallet.ts` / `seed-crypto.ts`):

1. `WDK.getRandomSeedPhrase(12)` si no hay vault.
2. Seed cifrada con PIN (AES-GCM) en `walinox.seed.v2`.
3. `new WDK(seed).registerWallet("ethereum", WalletManagerEvm, { provider })`.
4. Primera cuenta Ethereum = address del usuario.
5. Opcional: `@tetherto/wdk-wallet-evm-7702-gasless` para gas en USDT; si falla, EOA con ETH.

Al **crear** una cuenta nueva, la UI muestra la frase de 12 palabras y pide confirmar que se respaldó. En **Ajustes → Seguridad** se puede volver a ver con el PIN. Tras ~5 minutos de inactividad se vuelve a pedir PIN o biometría.

### Qué implica para el usuario

| | Extensión | Billetera local WDK |
| --- | --- | --- |
| Claves | En MetaMask / Rabby / etc. | En este navegador (vault cifrado) |
| Install | Sí | No |
| Backup | El de esa wallet | Anotar las 12 palabras |
| Firma | Popup de la extensión | En la página |
| Gas online | Según la wallet | Intenta USDT vía WDK 7702 |

WDK corre en el cliente. Tether no custodia la seed.

---

## Flujo al entrar

```
Landing
   │
   ▼
¿Tenés wallet?
   no ──► WDK crea/reabre seed local + PIN     sí ──► RainbowKit
        │                                              │
        └──────────────────┬───────────────────────────┘
                           ▼
                  Firma de términos (EIP-712, una vez)
                           ▼
                      App (Billetera)
```

## Qué podés hacer después

- **Billetera:** Ingresar (on-ramp), Recibir, Enviar, Pagar.
- **Tienda:** Cobrar (caja/POS) y Catálogo de productos propios.
- **Contactos, Avisos, Actividad, Ajustes.**

Sin billetera no hay saldo, envíos, caja, actividad ni ajustes.

La vitrina pública por link de tienda quedó **fuera del MVP** (ver `docs/roadmap.md`). El núcleo B2C es cobrar en el mostrador con el comprador firmando offline.
