# Variables de entorno

## Push (VAPID)

La clave **pública** tiene default en `src/lib/vapid.ts`.
La **privada** solo en el servidor — nunca en el repo.

En Vercel → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publica>
VAPID_PRIVATE_KEY=<privada>
VAPID_SUBJECT=mailto:hello@walinox.app
```

Generar un par nuevo:

```bash
npx web-push generate-vapid-keys
```

Sin `VAPID_PRIVATE_KEY`, el push queda deshabilitado (fail closed).

## Onramp (MoonPay · preferido por Tether WDK)

El módulo fiat documentado por Tether es `@tetherto/wdk-protocol-fiat-moonpay` (MoonPay).

```
NEXT_PUBLIC_MOONPAY_API_KEY=pk_test_…   # o pk_live_…
MOONPAY_SECRET_KEY=sk_test_…            # opcional; firma la URL y fija walletAddress
```

Sin la publishable key, el botón **Ingresar** avisa que falta configurar.
Con secret en el servidor, `/api/onramp/sign` firma el widget para prellenar la address.

## Postgres (Neon)

En Neon: **Connect** → tab `.env` → **Copy snippet**. Eso es `DATABASE_URL` (pooling ON). Pegalo en `.env.local`.

Opcional: apagá Connection pooling, copiá de nuevo como `DATABASE_URL_UNPOOLED` (migraciones locales).

En Vercel las mismas vars ya están (sensitive). Sin `.env.local` la PWA sigue en localStorage.
