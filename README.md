# tawau-aduan-ai-demo

Demo prototype for **e-Aduan Tawau AI** (municipal complaint triage).

## Install
```bash
npm install
```

## Run
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

## Optional env
Create `.env.local` if needed:
```bash
OPENAI_API_KEY=your_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

Behavior:
- If `OPENAI_API_KEY` exists, AI triage tries live model classification.
- If key is missing (or live call fails), deterministic mock triage is used.
- `Demo Mode` toggle in navbar forces mock triage even when key exists.
- If `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` exists, map uses Google Maps.
- Otherwise map falls back to Leaflet + OpenStreetMap + heat layer plugin.
- AI triage output is structured JSON:
  - `category`, `urgency`, `confidence`, `summary`, `department`, `eta_hours`, `reasoning`

## Routes
- `/` landing page with CTA buttons
- `/submit` citizen complaint form + real-time AI suggestions
- `/track/[id]` success page + tracking timeline
- `/admin` complaint table, filters, SLA countdown, right-side detail drawer
- `/insights` mayor KPI cards, 14-day trend chart (Recharts), map heat layer

## Demo walkthrough
1. Go to `/submit`, type pothole complaint text.
2. Watch AI suggestions update in real-time (category, urgency, department, ETA, confidence, reasoning).
3. Submit and copy tracking ID from `/track/[id]`.
4. Open `/admin`, locate complaint, open detail drawer, change status.
5. Return to `/track/[id]` and confirm timeline reflects status changes.
6. Open `/insights` for KPI cards, trend chart, and Tawau map heat visualization.
