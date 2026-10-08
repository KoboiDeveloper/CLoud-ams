# Cloud Storage

Dropbox-like file & sharing frontend (Next.js).

API digabung ke Nest **PROJECT MANAGEMENT DB** di `/api/cloud/*` (DB: `CLOUD_STORAGE`).

## Quick start

```bash
# Backend (PM Nest — includes Cloud API)
cd "../PROJECT MANAGEMENT DB"
npm run start:dev
# → http://localhost:1000

# Frontend (this repo root)
npm install
npm run dev
# → http://localhost:3100
```

`.env.local`:

```
BACKEND_API_URL=http://localhost:1000
NEXT_PUBLIC_API_URL=http://localhost:1000
```

Cloud JWT / Dropbox / DB env ada di `PROJECT MANAGEMENT DB/.env` (`CLOUD_*`).
