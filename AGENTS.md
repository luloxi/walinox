<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Walinox

PWA de USDT auto-custodia. UI en español. Settlement siempre USDT.

## MVP

**Pagos sin internet del comprador** (B2B y B2C).

- **P2P / B2B:** enviar, recibir, pedir, escanear firma.
- **B2C / Local:** el vendedor lista productos, arma el pedido en caja y cobra con **todos los canales offline** (QR, NFC, Bluetooth, sonido, luz, archivo, copiar). El comprador firma sin red; el asiento on-chain puede esperar red del que cobra. En Local: pestaña **Cobrar** (default) y **Catálogo**.

Fuera del MVP (ver [`docs/roadmap.md`](docs/roadmap.md)): **vitrina pública** por wallet, marketplace comprador, vales/canje, resumen mensual automatizado. No los reenganches en nav salvo pedido explícito.

## Cómo cambiar código

- Cambios quirúrgicos: tocá el mínimo de archivos y líneas. Preferí editar lo que ya existe a agregar wrappers, capas o archivos.
- Si lo mismo se puede hacer con menos código **sin romper comportamiento**, hacelo.
- No “optimices” achicando el producto: no saques scripts, dependencias, APIs, rutas ni config de `package.json` / `next.config.ts` / `tsconfig.json` / `components.json` / tools clave, salvo que el pedido lo pida.
- No rewrites ni refactors cosméticos. Andá rápido, puntual, con buenas prácticas.

## Marie Kondo + interfaz amena e intuitiva

Cada cambio busca **alegría, orden y nada de más**. La interfaz tiene que ser **amena e intuitiva**: se entiende al primer toque, no cansa, no abruma.

- Si algo no aporta (texto de relleno, acciones duplicadas, código muerto, pies de manual, badges “n/a”), **sacalo o plegalo**.
- La UI tiene que sentirse **liviana, intuitiva, simple y poderosa**. Priorizá el camino principal; lo avanzado va detrás de “Más…” o en Ajustes.
- **Separá modos claros** cuando una pantalla mezcla trabajos distintos (ej. Local: Cobrar vs Catálogo). El default es la acción del día a día.
- **Layout con aire**: título/brand y acción secundaria (tuerca, “Ver todos”, etc.) van en la misma fila con `justify-between` / space-around donde sea sensato. No dejes la acción primaria colgada a un costado sin balancear con el título. Headers, section labels + links, filas de lista: distribuí el espacio.
- **Coherencia visual**: mismas alturas de controles (tabs/botones `h-11`), tabs full-width en mobile, labels en español, un solo patrón por tipo de acción.
- **Deshacer reversible**: al borrar algo recuperable (contacto, etc.), volvé a la lista y mostrá un toast con **Deshacer** que se vaya solo (~5 s).
- No agregues secciones, tooltips ni explicaciones “por si acaso”. Si la pantalla se explica sola, el copy sobra.
- Al revisar una pantalla: ¿es amena? ¿se entiende sin leer un manual? ¿da alegría al usuario del día a día? Si no, cambiá o quitá.

## Tether

Siempre las prácticas **actuales** de Tether, no las de entrenamiento.

- Antes de tocar WDK / QVAC / gas 7702, leé los paquetes instalados (`node_modules/@tetherto/wdk`, `wdk-wallet-evm`, `wdk-wallet-evm-7702-gasless`, `@qvac/sdk`: README, `AGENTS.md`, types) y [docs.wdk.tether.io](https://docs.wdk.tether.io).
- No inventes APIs, un `permit()` de Tether, ni “Tether paga el gas”.
- WDK es no-custodial y corre en el cliente. La seed queda en el dispositivo; nunca en servidor.
- USDT mainnet **no** tiene ERC-2612 `permit()`. Gastos firmados = Uniswap Permit2. Transfer on-chain = ERC-20. Gas online = `@tetherto/wdk-wallet-evm-7702-gasless` (el bundler se paga en USDT); si falla, EOA (esa pide ETH).
- QVAC rellena campos (“¿en una frase?”). No es chat ni la billetera.
- No copies convenciones internas de los repos WDK (copyright, JSDoc para `.d.ts`) a esta app.

Más contexto: `docs/billetera.md`, `docs/mentores.md`, `docs/roadmap.md`.

## Roadmap (no borrar a ciegas)

Lo diferido está en **`docs/roadmap.md`**. **Local** (caja + productos + canales offline) es MVP. No confundir con la vitrina pública online.

## Comentarios

- No escribas comentarios de más. El código tiene que leerse solo.
- Si encontrás un comentario inútil, borralo.
- Si hay un constraint no obvio, explicalo bien — idealmente sobre Tether/USDT/Permit2/7702/QVAC (por qué no `permit()`, por qué gasless→EOA, por qué `sodium-javascript`).
