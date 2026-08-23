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
