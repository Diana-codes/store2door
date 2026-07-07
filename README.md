# Store2door Back Office

Accounting and reporting back office for Store2door — track sales, purchases, expenses, a cashbook with running balance, a summary ledger, and profit & loss reports. Amounts are Rwandan Francs (FRW) stored as integers.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Server Components + Server Actions)
- [Prisma](https://www.prisma.io) with SQLite for local dev (swap the datasource `provider` to `postgresql` for production)
- Tailwind CSS 4 + shadcn-style UI components (Base UI)
- Zod for validation, Recharts for the reports chart

## Requirements

- Node.js **20.9+** (Next.js 16 will refuse to run on older versions)
- pnpm 10

## Getting started

```bash
pnpm install

# Configure environment
cp .env.example .env

# Create the SQLite database and seed default categories + admin user
npx prisma migrate dev
pnpm db:seed

pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the seeded admin account (`admin@store2door.rw` / `admin123` by default — override via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before seeding).

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | Prisma connection string, e.g. `file:./dev.db` |
| `SESSION_SECRET` | in production | HMAC key for signing session cookies. The app refuses to start in production without it. Generate one with `openssl rand -hex 32`. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | no | Credentials for the admin user created by `pnpm db:seed` |

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint |
| `pnpm db:seed` | Seed categories and the admin user (idempotent) |
| `pnpm db:reset` | Drop and re-create the database, then re-seed |

## Deploying to Railway

The repo ships with a [railway.json](railway.json) that configures the build and a start command which runs pending migrations and the (idempotent) seed before booting. One Railway service runs everything — pages, server actions, and the SQLite database on an attached volume.

1. Push the repo to GitHub.
2. On [railway.com](https://railway.com): **New Project → Deploy from GitHub repo** and pick this repo. The first build will fail until steps 3–4 are done — that's expected.
3. Attach a volume to the service (right-click the service → **Attach Volume**) with mount path `/data`.
4. In the service's **Variables** tab add:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | `file:/data/store2door.db` |
   | `SESSION_SECRET` | output of `openssl rand -hex 32` |
   | `SEED_ADMIN_EMAIL` | your real admin email |
   | `SEED_ADMIN_PASSWORD` | a strong password (only used on first seed) |

5. Redeploy. When it's up, open **Settings → Networking → Generate Domain** to get your HTTPS URL (a custom domain can be added there too).

Every push to the default branch redeploys automatically. Note that `SEED_ADMIN_PASSWORD` only applies when the admin user is first created — changing it later does not update an existing user.

**Backups:** the volume is persistent but not backed up by default — enable volume backups in the volume's settings, or periodically download `/data/store2door.db`.

## Features

- **Dashboard** — today / this-month totals and recent activity
- **Sales** — manual entry, per-sale line items, and CSV import (rows with an invoice number are de-duplicated on re-import; imports are audited in `CsvImport`)
- **Purchases & Expenses** — categorised entries with quantity/unit support
- **Cashbook** — every cash movement with a running balance over the filtered period
- **Ledger** — totals grouped by revenue / cost of goods / operating expenses
- **Reports** — 30-day P&L chart, top-selling products, top expense categories
