# Backend startup diagnostic patch

Replace the included files in the backend project, then run:

```bash
npm run db:diagnose
npm run dev
```

The startup process now retries transient Hostinger/MySQL connection errors five times and prints full error details, including nested AggregateError network failures.

Optional `.env` settings:

```env
DB_STARTUP_RETRIES=5
DB_STARTUP_RETRY_DELAY_MS=3000
```
