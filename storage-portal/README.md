# Storage booking portal (React)

One-page storage booking website built with React + Vite.

```bash
npm install
npm run dev        # http://localhost:8080
npm run build      # production files in dist/
```

## Settings
Copy `.env.example` to `.env.local`.
- `VITE_BOOKING_API` – URL of the MoveIt storage backend that receives bookings. If it is empty the form still works and shows a reference number, but nothing is sent.

## Deploy on Vercel
Root Directory = `storage-portal`, Framework Preset = **Vite**, add `VITE_BOOKING_API` if bookings should reach the backend
(and set `MOVEIT_PORTAL_ORIGINS` on the backend to the portal's address).

Unit sizes, prices and availability are sample data in `src/data.js`.
