# Strategy Call Booking Admin Setup

## What this patch does

- Guest users can book a strategy call without logging in.
- Every booking is saved in the `bookings` MySQL/MariaDB table.
- Records appear in **Admin Panel > Strategy Calls**.
- Admin can search, view, edit, change status, add notes, and delete bookings.
- The startup seed is idempotent: it creates missing tables/fields/indexes without deleting existing data.
- It never inserts fake booking records.

## Automatic startup

Running:

```bash
npm run dev
```

starts `server.js`. The server calls `scripts/seedDatabase.js` before listening, so missing tables and fields are created automatically.

Hostinger production startup through `npm start` uses the same automatic seed.

## Optional manual check

```bash
npm run db:seed
```

Expected messages include:

```text
[SEED] Bookings table ready with 15 required fields.
[SEED] Guest booking records will appear in Admin Panel > Strategy Calls.
```

## Admin location

Open the authenticated admin dashboard and select:

```text
Strategy Calls
```

A public booking confirmation page must not contain an admin link. Only the submitted record is connected to the protected admin dashboard.
