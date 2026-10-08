# Cloud Storage

Dropbox-like file & sharing app (monorepo).

## Structure

- `api/` — NestJS + Prisma + SQL Server (`CLOUD_STORAGE`) + Dropbox
- `web/` — Next.js 15 (port **3100**)

## Quick start

```bash
# API
cd api
npm install
npx prisma db push
npm run seed
npm run start:dev

# Web (other terminal)
cd web
npm install
npm run dev
```

- API: http://localhost:1100
- Web: http://localhost:3100

Default SUPER user comes from `api/.env` (`ADMIN_NIK` / `ADMIN_PASSWORD`).
