# Storage booking portal (one-page website)

Static site (no build step). Deploy to Vercel with **Root Directory = `storage-portal`** and Framework Preset **Other**.

1. Edit `config.js` and set `window.BOOKING_API` to the deployed backend URL.
2. On the backend set `MOVEIT_PORTAL_ORIGINS` to this site's origin (e.g. `https://storage.example.com`), otherwise the browser blocks the booking request.
Local preview: `npx serve .` (backend default allows http://localhost:8080 — use `npx serve -l 8080 .`).
