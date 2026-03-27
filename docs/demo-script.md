# 10-Minute Demo Pitch Script

## 1) Problem framing (1.5 minutes)
- Tawau municipal complaint handling is still mostly manual.
- Incoming reports are not consistently triaged by urgency and department.
- Response speed varies because queue prioritization is hard to see in real time.
- Leadership lacks one-screen visibility: hotspot map, overdue SLA, and trend movement.
- Result: slower resident response, inconsistent follow-up, and weak accountability.

## 2) Solution framing (1 minute)
- **e-Aduan Tawau AI** is a lightweight triage layer on top of complaint intake.
- AI suggests category, urgency, department, and ETA in seconds.
- Staff gets SLA countdown and operational filters.
- Mayor gets KPI + trend + zone map heat layer for decisions.

## 3) Live demo flow (5.5 minutes)

### Step A: Citizen submission (2 minutes)
- Open `/submit`.
- Enter a sample case: "Large pothole near school, motorcycles almost skidding".
- Point out real-time AI suggestions (debounced):
  - Category -> `ROAD`
  - Urgency -> `HIGH`
  - Department -> `Road Maintenance Unit`
  - ETA -> `24h`
- Click submit.

### Step B: Citizen tracking (1 minute)
- Land on `/track/[id]`.
- Show generated tracking ID and timeline with current status.
- Explain residents can follow progress without calling the office.

### Step C: Admin operations (1.5 minutes)
- Open `/admin`.
- Show filters (zone/category/status/urgency) and SLA countdown column.
- Click the new complaint row to open right-side drawer.
- Update status from `RECEIVED` -> `ASSIGNED` -> `IN_PROGRESS`.
- Mention timeline events are appended instantly.

### Step D: Leadership view (1 minute)
- Open `/insights`.
- Show KPI cards: total this month, resolved rate, average resolution time, overdue count.
- Show 14-day trend chart for demand signal.
- Show map heat layer and category-colored points across Tawau zones.

## 4) Closing proposal (2 minutes)

### 3-month pilot proposal
- Pilot in **2 zones first**: Bandar + Apas.
- Deploy as operational demo with weekly KPI review.

### Pilot KPIs
- Median triage time
- SLA compliance rate
- Time-to-assignment
- Resolution turnaround time
- Resident follow-up completion

### Budget range (demo-to-pilot)
- RM 60,000 - RM 120,000 for 3-month pilot
- Includes setup, integration support, dashboard refinement, and training

### Next steps
1. Approve pilot scope and selected zones.
2. Confirm municipal department workflow mapping.
3. Start pilot sprint (week 1 setup, week 2 go-live, weekly KPI governance).
