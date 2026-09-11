# Engineering Calculator Hub

A single-page React app bundling six engineering calculators (3-phase motor
current, voltage drop, kW↔HP conversion, VFD sizing, power/current/PF, and a
general unit converter) plus a built-in formulas & laws reference page.

## Run locally

```bash
npm install
npm run dev
```

Open the printed localhost URL (usually http://localhost:5173).

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. On vercel.com, click "Add New" → "Project" and import that repo.
3. Vercel auto-detects the Vite settings (build command `npm run build`,
   output directory `dist`) — just click "Deploy".
