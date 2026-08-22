# Walinox — brief para mentores

Repo: `luloxi/walinox` · Demo: `walinox-nu.vercel.app` · Stack: Next.js PWA, Tether WDK, QVAC, USDT en Ethereum.

---

## 1. Presentación del proyecto

### En una frase

Walinox es una **billetera USDT auto-custodia** que deja **firmar un gasto sin internet** y pasárselo a otro celular (QR hoy; Bluetooth, NFC y sonido como canales). Los tokens **no se mueven en el aire**: se mueven cuando alguien, ya online, ejecuta esa firma on-chain.

### El problema

En un kiosco, una feria o un barrio con mal señal:

- Una wallet normal (MetaMask, exchange) **necesita red** para mandar USDT.
- “Stablecoin para el día a día” choca con gas en ETH, `permit()` que USDT **no tiene**, y UX de hex.
- Un comercio chico no quiere desplegar un ERC-721 ni un POS cripto pesado. Quiere: cobré, le di un ticket, entregué el pan.

### Qué hace Walinox

| Pieza | Para quién | Qué resuelve |
| --- | --- | --- |
| **Billetera** | Particular | Saldo USDT, depositar (QR de address), enviar online o por permiso QR |
| **Contactos** | Particular / comercio | Agenda + historial por persona |
| **Tienda** | Comprador / vendedor | Productos con foto; el pago es USDT; el título es un **vale firmado** (no un NFT en un contrato) |
| **Actividad** | Los dos | Ingresos/gastos por mes, trimestre, año; tienda vs envíos personales; link a Etherscan |
| **Avisos** | Los dos | Push PWA cuando te mandan USDT, un vale o un ping |

No es un exchange, no custodia fondos, no emite USDT. Las claves las tiene el usuario (RainbowKit / MetaMask / Rabby, o una seed WDK local).

### Dos modos de “enviar plata”

```
ONLINE                         OFFLINE (sin red entre los dos teléfonos)
────────                       ────────────────────────────────────────
Wallet firma un ERC-20         Wallet firma EIP-712 (Permit2)
transfer.                      Se pasa el JSON firmado (QR / archivo / …).
Gas en USDT (WDK 7702          El receptor, cuando tenga internet,
+ paymaster Candide).          hace approve Permit2 (una vez) y
                               permitTransferFrom. Ahí sí se mueve el USDT.
```

Eso es el núcleo de la tesis: **separar “autorizar” de “asentar en la cadena”**.

### Demo que se puede mostrar

1. Login → conectar wallet → firmar términos (una vez).
2. Enviar 10 USDT online a un contacto (o `lulox.eth`).
3. Modo avión: armar permiso QR → el otro celular escanea en Depositar → Submit Permit2.
4. Tienda: comprar un café de demo → vale QR → el vendedor canjea.
5. Actividad: ver gastos vs ingresos, cuánto vino de tienda.

Localhost usa saldo y catálogo de prueba para que 25/50/75/MAX y la tienda se puedan mostrar sin mainnet.

### Con quién habla el stack (Tether)

- **WDK**: firma EIP-712 en el dispositivo.
- **WDK 7702-gasless**: el envío online paga gas en **USDT**, no en ETH.
- **QVAC**: ayudante local (“¿en una frase?”) para completar formularios. No es un chatbot.

---

## 2. Cómo se cuenta en 6 slides

1. **Gancho.** USDT es lo que la gente quiere gastar. Ethereum no es un POS. ¿Y si el kiosco no tiene Wi‑Fi?
2. **Idea.** Firmar ahora, asentar después. El QR es un cheque, no un wire.
3. **Por qué no ERC-2612.** USDT mainnet no tiene `permit()`. Permit2 es el estándar que ya usa Uniswap.
4. **Producto.** Billetera + contactos + tienda de vales físicos + actividad.
5. **Compliance.** El “NFT” es un vale de un bien, no un instrumento financiero. El canje lo confirma el emisor.
6. **Qué pedimos.** Feedback de tesis (¿el cheque offline es entendible?), de riesgo (Permit2 infinite approve), de go-to-market (comercio de barrio vs P2P).

---

## 3. Insights al construir

### 3.1 USDT no tiene `permit()` — y eso cambia el producto

**Lo que creíamos al arrancar.** ERC-2612 (`permit`): el dueño firma EIP-712, el spender llama `permit()` + `transferFrom`. Muchos tutoriales y USDC funcionan así.

**Lo que es USDT en Ethereum mainnet** (`0xdAC17F958D2ee523a2206206994597C13D831ec7`):

- No implementa `permit()`.
- El `approve` clásico es un tx on-chain (y el USDT viejo además tiene el quirk de tener que poner allowance en 0 antes de cambiarlo).
- No se puede “inventar” un `permit()` de Tether. Sería una firma que **ningún contrato va a honrar**.

**Workaround que usamos: Uniswap Permit2**

Contrato canónico: `0x000000000022D473030F116dDEE9F6B43aC78BA3`.

1. El usuario hace **una vez** `USDT.approve(Permit2, max)` (gas en USDT vía 7702).
2. Cada gasto offline es un EIP-712 `PermitTransferFrom` (token, amount, spender, nonce, deadline).
3. El receptor llama `permitTransferFrom` en Permit2. Permit2 debita el USDT.

La firma viaja en un JSON (`SignedEnvelope`). Verificarla es `verifyTypedData` en el teléfono, sin RPC.

**Implicancia de producto.** El usuario ve “firmar un envío”. En realidad firma “X puede sacar N USDT hasta tal fecha”. Hay que decirlo en castellano (los `?` del UI). El approve-una-vez a Permit2 es el paso más friccional y el que hay que explicar a mentores: es el mismo patrón que Uniswap, no un backdoor nuestro.

### 3.2 Firmar ≠ mover tokens

El error conceptual más fácil de cometer (y de vender mal):

| Momento | Qué pasa | Internet |
| --- | --- | --- |
| Firma EIP-712 | Hay un **cheque** | No |
| Pase QR / archivo / tag | El otro tiene el cheque | No |
| `permitTransferFrom` | El USDT cambia de dueño | Sí (el que ejecuta) |

Si el receptor nunca sube la firma, el dinero no salió. Si la firma vence (`deadline`, default 30 días), el cheque caduca. Eso es una feature (límite de riesgo), no un bug.

### 3.3 “Gasless” no es “Tether te lo regala”

Una EOA clásica paga gas en ETH. Tether **no** tiene un programa “nosotros pagamos tu gas”.

Lo que sí hay es el módulo oficial `@tetherto/wdk-wallet-evm-7702-gasless`:

1. **EIP-7702**: la EOA se delega a una smart account (`0xe6Cae83B…`).
2. **ERC-4337**: el envío sale como UserOperation.
3. **Paymaster en USDT** (Candide público, sin API key, rate-limited).

Hace falta **un poco más de USDT** aparte del monto. Si el bundler falla, caemos a tx EOA (esa sí pide ETH).  
“Sponsored” (gas a cero) existe en el mismo módulo pero pide policy + API key de dashboard. No lo usamos: el demo no debe depender de una key.

### 3.4 Canales sin internet: la arquitectura vs lo que hay hoy

**Arquitectura (lo que queremos poder decir):** el sobre firmado es un blob JSON. Cualquier tubo que lleve bytes de un celular al otro sirve: QR, Bluetooth, NFC, sonido, luz, archivo, copy.

**Estado real en el código (importante ser honestos con mentores):**

| Canal | ¿Pasa el payload? | Notas |
| --- | --- | --- |
| **QR** | Sí | Camino demo. El receptor escanea en Depositar. Funciona en avión después del primer load (PWA). |
| **Copy** | Sí | Portapapeles. |
| **Archivo** | Sí | `.json` para WhatsApp / AirDrop / pendrive. |
| **NFC** | Parcial | Escribe el JSON en un **tag NDEF**. No es “dos celulares que se tocan” (Android Beam ya no existe). Sirve como “deje el vale en una etiqueta”. Web NFC ≈ Chrome Android. |
| **Bluetooth** | No todavía | Abre el picker de Web Bluetooth. **No hay servicio GATT Walinox** ni escritura al otro teléfono. El comentario en código lo dice. |
| **Sonido** | No todavía | Toca 0,6 s a 18 kHz. **No modula el JSON**. El otro teléfono no puede reconstruir el permiso. |
| **Luz** | No todavía | Flash de pantalla. No hay decodificación por cámara. |

Los caminos **confiables para una demo delante de alguien** son QR, copy y archivo. BLE / NFC P2P / audio / light están **expuestos en la UI** cuando el browser tiene la API, pero no cierran el loop celular ↔ celular.

**Por qué cuesta tanto en una PWA**

- **Web Bluetooth**: el otro dispositivo tiene que anunciar un servicio. Un Chrome no es un peripheral GATT out of the box; hace falta un diseño (uno como central, uno como peripheral, o un “bridge”). iOS Safari no tiene Web Bluetooth.
- **Web NFC**: pensado para **tags**, no para P2P. iOS no lo da a páginas.
- **Audio**: hay librerías (ggwave, chirp). Hay que modular el payload, calibrar volumen, lidiar con micrófono y permisos. Un beep no alcanza.
- **iOS**: PWA + sensors es el peor caso. QR + archivo (Share sheet) es lo que realmente vive en iPhone.

**Qué habría que construir para poder decir “los cuatro andan”**

1. QR — ya.
2. NFC — mantener write-to-tag; opcional: el receptor en “escuchar tag”.
3. Bluetooth — definir UUID de servicio + characteristic, `writeValue` del JSON, del otro lado `startNotifications` / read. Demo realista: Android Chrome ↔ Android Chrome.
4. Sonido — encoder/decoder (FSK o ggwave) del `SignedEnvelope`, no un tono fijo.

Hasta que eso esté, en la charla conviene: *“el objeto de valor es la firma; el canal es intercambiable. Hoy el canal de producción es QR.”*

### 3.5 El vale “NFT” no es un ERC-721

Un comercio no va a pagar deploy + gas de colección. El vale es **EIP-712** (tokenId, producto, holder, precio, vencimiento, hash de términos). Quien tiene el JSON firmado tiene el título. El canje es el emisor escaneando y marcándolo.

El **pago** sí es on-chain (USDT). El **título** no.  
Compliance que pedimos al publicar: es un vale de un bien físico, no un instrumento financiero; hay lugar y plazo; el emisor entrega; emisión y canje quedan registrados.

Aprendizaje: “NFT de producto” vende mal y asusta regulación. “Ticket firmado, como una entrada” se entiende.

### 3.6 QVAC no es el producto, es un atajo de formulario

Tentación: una tab de chat con historial y pines. Eso duplica Actividad y Contactos y pone al modelo en el centro.

Lo que quedó: un destello **¿En una frase?** en enviar / contactos / publicar. Completa campos y se cierra.

Modelo default **Qwen3 0.6B Instruct Q4** (~382 MB): entra en celulares, habla español, el job es JSON corto. Llama 3.2 1B es el default del SDK y va peor en “mandale / guardá”. Si QVAC no está, un parser heurístico alcanza para “10 USDT + 0x…”.

QVAC **no corre en el browser** (worker Bare). La PWA llama `/api/agent` o se cae al heurístico offline.

### 3.7 PWA, notificaciones y serverless no se llevan bien

Push de verdad (el otro celular apagó la app) pide VAPID + suscripción guardada por address. En Vercel las functions no tienen disco durable: las suscripciones mueren en un cold start. Local (archivo `.data/`) sí. Inbox local + poll cubren el resto.

iPhone: avisos solo si la PWA está en Inicio, iOS 16.4+.

### 3.8 Login, saldo fantasma y “modo OpenSea”

Sin wallet conectada **no puede haber saldo**. Un WDK local que se creaba solo + mock `1284.50` en localhost hacía ver plata que no era de nadie.

Flujo: conectar → firmar términos (EIP-712, una vez por address) → elegir **firmar cada envío** (default) o **modo rápido de sesión** (ERC-7715 `wallet_grantPermissions`, 24 h). MetaMask clásico / Rabby muchas veces **no** implementan 7715; entonces se firma cada tx y no se miente. La seed local sí puede ser silenciosa.

### 3.9 Otras piedras del camino

- **RainbowKit + Coinbase / x402**: el conector de Coinbase tiraba el build por `@x402/*`. Lo sacamos y stubbeamos. Menos wallets, app que compile.
- **USDT vs USDC en la UI**: USDC tiene `permit()`; mostrar los dos confundía. Producto = USDT.
- **ENS / Basenames**: el campo de envío resuelve `vitalik.eth` y `alice.base.eth`; si no hay avatar, identicon `blo` (Scaffold-ETH).
- **QR de address ajenas**: hay que parsear EIP-681, deep links de MetaMask/Trust, JSON de Rabby/Binance, CAIP-10, `usdt:` / `tether:`. El usuario no pega “un 0x limpio”.
- **Serwist / service worker**: el SW de Next no convivía bien con Turbopack. SW a mano en `public/sw.js` (cache + push).
- **sodium-native**: WDK en browser → alias a `sodium-javascript`.
- **Actividad ≠ saldo**: el dashboard de movimientos no lleva el balance; lleva períodos y Etherscan.

---

## 4. Preguntas para mentores

**Tesis / producto**

- ¿“Cheque firmado, cobro después” es entendible para alguien que usa Mercado Pago, o hay que disfrazarlo de “envío” y el asentamiento es detalle?
- ¿El kiosco es el usuario, o el P2P entre conocidos es más realista al inicio?
- ¿El vale-ticket alcanza, o sin un contrato on-chain de canje no hay confianza comercial?

**Riesgo**

- Approve infinito a Permit2: ¿lo bancan, o hay que limitar allowance al monto de cada sesión?
- Deadline de 30 días: ¿muy largo (robo del teléfono) o muy corto (feria de fin de semana)?
- Seed WDK en `localStorage`: inaceptable en producción; ¿passkeys / MPC / solo wallets inyectadas?

**Técnica**

- ¿Vale la pena invertir en BLE/audio reales en web, o el offline “de verdad” es app nativa (o WalletConnect + QR nomas)?
- Paymaster público Candide: ¿ok para demo, o hay que una policy propia antes de mostrar a Tether?
- EIP-7702 en wallets de consumo: ¿el usuario entiende la delegación?

**Go-to-market / narrativa Tether**

- ¿Esto es un case de WDK + QVAC, o un case de “USDT en la calle”?
- ¿Tiene sentido testnet / una chain más barata, o el punto es mainnet USDT aunque el gas duela?

---

## 5. Qué está listo vs qué es próximo

**Listo para mostrar**

- Login, términos, billetera, envío online, permiso QR (ida y vuelta), contactos, tienda comprador/vendedor, vales, actividad con gráficos, avisos PWA, QVAC/heurística, gas en USDT.

**No listo (y no venderlo como listo)**

- Bluetooth celular ↔ celular.
- Sonido que transporte el permiso.
- Luz / cámara como canal.
- NFC como tap entre dos teléfonos (sí como tag).
- Push durable en Vercel.
- Modo rápido en cualquier EOA.

**Próximo si la tesis aguanta**

1. Cerrar QR + archivo como “offline v1” y documentar el resto como experimental.
2. Un canal extra **de verdad** (NFC tag o ggwave) para la demo “sin mirar la pantalla”.
3. Allowance Permit2 acotado al monto.
4. Sacar la seed de `localStorage`.

---

## 6. Glosario rápido

| Término | En criollo |
| --- | --- |
| EIP-712 | Mensaje estructurado que la wallet muestra y firmás. |
| ERC-2612 `permit()` | “Esta firma es un approve”, lo tiene USDC, **no** USDT mainnet. |
| Permit2 | Contrato de Uniswap que sí acepta firmas de gasto sobre USDT. |
| EIP-7702 | Tu address 0x se comporta un rato como smart account. |
| ERC-4337 | El “correo” con el que el bundler manda esa cuenta. |
| Paymaster | Quién paga el gas; acá se cobra en USDT. |
| Vale | Ticket firmado de un bien físico; no un NFT deployado. |
| Envelope | El JSON con typed data + signature que viaja por QR. |
