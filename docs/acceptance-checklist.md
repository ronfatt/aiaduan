# Demo Readiness Checklist

## Project setup
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts local server
- [ ] `npm run build` compiles successfully

## Core routes
- [ ] `/` shows landing with 2 CTA buttons
- [ ] `/submit` form works and submits new complaint
- [ ] `/track/[id]` shows success data + timeline
- [ ] `/admin` shows table + filters + detail drawer
- [ ] `/insights` shows KPI cards + trend chart + map

## UI and navigation
- [ ] Top navbar shows brand `e-Aduan Tawau AI`
- [ ] Navbar shows `Demo Prototype` badge
- [ ] Admin left-side nav appears on `/admin` and `/insights`
- [ ] UI is mobile-friendly and readable at small widths

## Data and state
- [ ] `/data/seed.ts` has 30 seeded complaints
- [ ] Seed includes required categories and status values
- [ ] Complaints persist via localStorage reload
- [ ] Status updates in admin reflect on tracking timeline

## AI triage
- [ ] `/lib/triage.ts` exports `triageComplaint(...)`
- [ ] Mock deterministic triage works without API key
- [ ] Live triage attempted when `OPENAI_API_KEY` exists
- [ ] `/submit` shows real-time debounced AI suggestions
- [ ] Demo Mode forces mock triage even with API key
- [ ] AI suggestions show confidence percentage
- [ ] AI suggestions show collapsible reasoning explanation
- [ ] AI output includes `category/urgency/confidence/summary/department/eta_hours/reasoning`

## Admin SLA
- [ ] SLA countdown shown per row
- [ ] HIGH uses 24h, MEDIUM uses 72h, LOW uses 7d
- [ ] Overdue styling is visible

## Insights
- [ ] KPI cards calculate from seeded/live state
- [ ] 14-day trend chart renders via Recharts
- [ ] Map shows Tawau points from seed coordinates
- [ ] Without Google key, Leaflet + heat layer is used

## Auditability
- [ ] Raw input + AI output + confidence + timestamp are saved in local audit records
- [ ] Admin detail drawer can show audit fields for a selected complaint
