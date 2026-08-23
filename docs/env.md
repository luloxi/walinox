# Variables de entorno

## Push (VAPID)

Claves generadas para este proyecto. La **pública** ya está como default en código.
La **privada** solo va en el servidor (Vercel → Settings → Environment Variables).

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BITqprPMRHXLOFZbHecSTW4TA6cDVPhXWYHvEotsGOU0dVx1byl7i2Izd4TFXx7lzAiq0vcVM0zJw7FQVKQuCf4
VAPID_PRIVATE_KEY=IbNrPxTXW2t5VzTtJ-tp1nC-X4C_EC22-r8Jb3uGgxk
VAPID_SUBJECT=mailto:hello@walinox.app
```

Sin `VAPID_PRIVATE_KEY`, subscribe/notify no envían push (fail closed).

Para rotar:

```bash
npx web-push generate-vapid-keys
```
