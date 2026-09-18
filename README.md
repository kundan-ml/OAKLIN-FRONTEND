# Lens Inspection Frontend v3

Modern Next.js industrial HMI for the OKLIN3-inspired offline lens inspection workflow.

## Major changes in V3

- Completely redesigned modern UI
- **Real HTML5 Canvas** inspection viewer (not a transformed `<img>`): pan, wheel zoom, fit, 1:1, fullscreen, gray-value probe, crosshair and defect overlays
- `.h.bmp` shown as **High Contrast** and `.d.bmp` as **Dark Field**
- Main inspection dashboard + WT History + Image Storage + BV Test + Focus/Jig + Registration + Camera Setup + General Settings + System/Help pages
- Hold lens, error selection, AT-only filter, snapshots, WT archive, yield, logs and WebSocket progress
- Manual-style advanced image storage and focus/jig workflows

## Run

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

The frontend expects FastAPI at `http://localhost:8000/api/v1` by default.

> The source was syntax-checked in the generation environment. Full `next build` requires npm dependencies; registry access was not available in that environment, so run `npm install && npm run build` on your development machine.
