# Admin login reset on Hostinger

Add these values to the backend `.env` file:

```env
ADMIN_LOGIN_NAME=DMCA Master Admin
ADMIN_LOGIN_EMAIL=admin@dmcamaster.com
ADMIN_LOGIN_PASSWORD=DmcaMaster@2026
```

Then run from the backend project root:

```bash
npm install
npm run db:sync
npm run admin:seed
```

Restart the Hostinger Node.js application after the command succeeds.

`npm run admin:seed` is a manual one-time reset command. It creates the admin
if missing, or safely replaces the existing admin password with a bcrypt hash.
Normal backend restarts do not reset a password changed later from Admin Settings.
