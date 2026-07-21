# DMCA Master Backend

Express + MySQL backend for the DMCA Master website, client portal, admin panel and blog CMS.

## Included features

- JWT authentication with email verification and password reset OTPs
- Admin-only routes protected by role middleware
- Login, OTP and contact-form rate limiting
- Protection case management for clients and admins
- Contact form storage with admin search, view, edit and delete actions
- Registered-user search, view, edit and delete actions
- Dynamic blog CMS with drafts, publishing, categories, tags and per-post SEO
- Global layout metadata and Google verification settings
- Hostinger-compatible image uploads stored in `uploads/`
- Automatic database table creation and safe upgrades for older installations

## Temporary administrator account

The first backend start creates this administrator when the account does not already exist:

- Email: `admin@dmcamaster.com`
- Password: `DmcaMaster@2026`

Change the password immediately from **Admin Panel → Admin Settings**. The initial values can be changed with `ADMIN_LOGIN_EMAIL`, `ADMIN_LOGIN_PASSWORD` and `ADMIN_LOGIN_NAME` before the first start.

## Local setup

1. Copy `.env.example` to `.env`.
2. Enter the MySQL, SMTP, domain and JWT values.
3. Create the database named in `DB_NAME`; the application creates all tables.
4. Install and run:

```bash
npm ci
npm run dev
```

Health check: `GET /api/health`

## Hostinger deployment

1. Upload this backend folder to the Node.js application directory.
2. Configure Node.js 18 or newer and startup file `server.js`.
3. Add all values from `.env.example` in Hostinger's environment configuration.
4. Set `PUBLIC_API_URL` to the public backend URL, for example `https://api.dmcamaster.com`.
5. Set `CORS_ORIGINS` to the frontend origins separated by commas.
6. Run `npm ci` and restart the Node.js application.
7. Ensure the application process can write to the `uploads` directory. The directory is created automatically if missing.

Uploaded images are served at `/uploads/<filename>` and are limited to 8 MB. JPG, PNG, WEBP and GIF are accepted.

## Main API groups

- Public: `/api/blogs`, `/api/blog-categories`, `/api/blog-tags`, `/api/site-settings`, `/api/send-email`
- Authentication: `/api/auth/*`
- Client protection: `/api/cases/*`
- Admin: `/api/admin/contacts`, `/api/admin/users`, `/api/admin/blogs`, `/api/admin/categories`, `/api/admin/tags`, `/api/admin/settings`, `/api/admin/uploads`

## Production checklist

- Replace `JWT_SECRET` with a long random value.
- Replace the temporary administrator password.
- Keep `.env` outside source control and backups shared with third parties.
- Use HTTPS for both frontend and API.
- Back up the MySQL database and `uploads` directory together.
