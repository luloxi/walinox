# Database

Postgres (Neon en Vercel) + Prisma. La app es **offline-first**: productos, contactos, prefs y actividad viven en **localStorage**. La seed **nunca** va a la DB.

## Copia en la nube (automática)

Con wallet lista e internet, la app **guarda sola** un snapshot (debounce ~8 s tras cambios, y cada ~3 min). En **Tienda** hay un chip con la antigüedad de la última copia; tocarlo fuerza un guardado. En Ajustes podés **Guardar ahora** o **Restaurar** (con confirmación).

No pide firma de wallet: es backup de datos de app, no de claves. Rate limit en el API. Solo se aceptan productos cuyo `issuer` sea la address dueña.

| En DB | Nunca en DB |
|---|---|
| Productos propios, contactos, prefs, tema, recibos, inbox, vales locales | Seed / claves |
| | Saldo USDT (on-chain) |

## Stack

- Prisma + Postgres (`DATABASE_URL` / `POSTGRES_PRISMA_URL`)
- Modelo: `CloudBackup(address, payload Json)`
- Auth: sin firma (MVP); mitigación = rate limit + issuer check

En local, sin esas env, la app corre igual y el endpoint responde 503.

```bash
npx prisma migrate deploy
npm run dev
```

Build en Vercel: `prisma generate` + `prisma migrate deploy`.
