# Diagnostic SQL fix

Replace `scripts/diagnoseDatabase.js` with the included file, then run:

```bash
npm run db:diagnose
```

This fixes a MariaDB parse error caused by using `current_user` as an unquoted alias. It does not change your database schema or data.
