# Database (post-MVP)

## Por qué

Hoy casi todo el estado de app vive en **localStorage** del browser:

- catálogo / productos (`walinox.catalog`)
- contactos, inbox local, recibos, prefs, tema
- seed cifrada (`walinox.seed.v2`)

Eso funciona offline, pero **no se recupera** en otro dispositivo ni tras borrar datos del sitio.

Una DB (Prisma + Postgres) permite que, al **loguearse y firmar** con la wallet, el user recupere su info de app **sin** poner la seed en el server.

## Qué va en DB vs qué no

| En DB (scoped a `address`) | Nunca en DB |
|---|---|
| Productos / catálogo de la tienda | Seed / claves privadas |
| Contactos, preferencias de UI | Fondos / saldo (siempre on-chain) |
| Metadatos de tienda | |
| Inbox sincronizado (opcional) | |

La **verdad del USDT** sigue siendo Ethereum (`balanceOf`, transfer, Permit2).

## Auth: no impersonator

1. Server emite **nonce**.
2. User firma con la wallet (SIWE o EIP-712).
3. Server verifica firma → sesión JWT corta ligada a `0x…`.
4. CRUD de productos/contactos solo para esa address.

Sin la clave de esa address no se lee ni se pisa data ajena.

## Stack sugerido

- **Prisma** + **Postgres** (Neon / Supabase / Vercel Postgres)
- Modelos: `User(address)`, `Product`, `Contact`, `InboxItem`
- Auth por firma, no email/password
- En Vercel el push store en archivo local es frágil; Postgres sí sobrevive deploys

## Orden de implementación

1. Auth por firma (sesión / JWT).
2. Sync de **productos** (lo más doloroso si se pierde).
3. Contactos y preferencias.
4. Inbox multi-device (opcional).

## MVP actual

Seguimos offline-first con localStorage. Este doc es el plan para cuando haga falta **recuperar tienda y prefs** entre dispositivos.
