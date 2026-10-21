# MoveIt Storage Management System

Two separate apps:

| Folder | What it is | Default port | Deploy to |
|---|---|---|---|
| `frontend/` | Web pages only (Next.js, React, Tailwind, 3D warehouse). Forwards `/api/*` to the backend. | 3000 | Vercel |
| `storage-portal/` | The public one-page booking website (React + Vite). Sends bookings to the backend. | 8080 | Vercel (Root Directory `storage-portal`, preset Vite) |
| `backend/` | API + sign-in + SQLite database (Next.js route handlers). | 4000 | A server with a persistent disk (VPS / Railway / Render), or any host once the DB is moved to Postgres |

## Run locally
```bash
# terminal 1 – backend
cd backend && cp .env.example .env.local && npm install && npm run dev      # http://localhost:4000

# terminal 2 – frontend
cd frontend && cp .env.example .env.local && npm install && npm run dev     # http://localhost:3000
```
Sign in with the bootstrap Super Admin `admin@moveit.local` / `Admin@12345` (change it after the first login).
Optional demo warehouse: `cd backend && npm run seed:demo-warehouse` (set `BASE_URL=http://localhost:4000 (default)`).

## Frontend on Vercel
1. Import the repo in Vercel and set **Root Directory = `frontend`**.
2. Environment variable: `BACKEND_URL=https://<your deployed backend>`.
3. On the backend set `MOVEIT_ALLOWED_ORIGINS=<your-vercel-domain>` (host only, comma separated for several).

The backend keeps data in a SQLite file, so it needs a host with a persistent disk; it cannot run on Vercel serverless as is.
See `backend/.env.example` for backend settings. `types/` and `services/interfaces/` exist in both folders (shared contracts); keep them in sync.
