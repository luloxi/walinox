# Database

Postgres (Neon en Vercel) + Prisma. La app es **offline-first**: productos, contactos, prefs y actividad viven en **localStorage**. La seed **nunca** va a la DB.

## Copia en la nube

En Ajustes → **Copia en la nube**, con internet, la wallet firma (EIP-712, mismo patrón que el push) y guarda o restaura un snapshot scoped a `0x…`.

| En DB | Nunca en DB |
|---|---|
| Productos propios, contactos, prefs, tema, recibos, inbox, vales locales | Seed / claves |
| | Saldo USDT (on-chain) |

Sin la firma de esa address no se lee ni se pisa data ajena.

## Stack

- Prisma + Postgres (`POSTGRES_PRISMA_URL` pooled, `POSTGRES_URL_NON_POOLING` para migraciones)
- Modelo: `CloudBackup(address, payload Json)`
- Auth: `verifyPushAuth` con action `backup` / `restore`

En local, sin esas env, la app corre igual y el endpoint responde 503. En Vercel las vars son **sensitive**: `vercel env pull` no trae el valor; el runtime del deploy sí las tiene. Para probar backup en `next dev`, pegá las URLs de Neon en `.env.local`.

```bash
npx prisma migrate deploy   # schema
npm run dev                 # localStorage-first
```

Build en Vercel corre `prisma generate` + `prisma migrate deploy`.
