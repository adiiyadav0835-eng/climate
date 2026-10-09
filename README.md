# Climate-Aware Emergency Response Network (CAERN)

**SIMULATION MODE — NOT FOR REAL-WORLD DISPATCH.**  
*An educational GIS-based disaster decision-support prototype modeled after an urban flood and disaster scenario (Pune, Maharashtra fictional baseline).*

---

## 1. System Overview

CAERN is an interactive GIS command operations platform designed for emergency managers and urban planners. It simulates climate-induced disasters (monsoon floods, cyclones, severe heatwaves), and uses deterministic algorithms to calculate:

1. **Hazard-Aware Routing & Evacuation**: Dijkstra shortest-path router accounting for waterlogged velocity penalties, physical bridge closures, and alternative corridor detours.
2. **Emergency Incident Triage & Ambulance Dispatch**: Strict 1:1 vehicle-to-incident allocation, prioritizing critical cases by waiting time, casualty count, and transit latency.
3. **Standby Fleet Repositioning**: Optimizes idle vehicle positioning toward elevated high-ground nodes to minimize downstream response time.
4. **Hospital Network Selection**: Multi-criteria destination matching that evaluates available beds, trauma/burn capabilities, and flood-free transit routes while filtering out saturated facilities.
5. **Temporary Medical Resource Planner (MCDA)**: Multi-Criteria Decision Analysis for placing Field Clinics, Relief Camps, Mobile Medical Units, and Medical Supply Depots. Enforces a **strict safety constraint**: any candidate site that is flooded or cut off is disqualified with a score of 0 regardless of emergency demand.
6. **Supply Depot Inventory**: Tracks critical medical supplies, models disaster consumption, guards against over-allocation, and routes inter-depot transfers.
7. **Emergency Planning Assistant**: Grounded AI decision support powered by Gemini (with a deterministic local fallback).

---

## 2. Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React icons
- **GIS Mapping**: Leaflet with OpenStreetMap base tiles and custom SVG DivIcons
- **Analytics**: Recharts (bar charts, status donuts, demand breakdowns)
- **State & Storage**: HTML5 LocalStorage with schema versioning and instant reset
- **AI Integration**: `@google/genai` (Google Gen AI SDK) with contextual grounding and deterministic rule-based fallback

---

## 3. Core Algorithms

### A. Dijkstra Graph Router (`src/services/routingService.ts`)
- Undirected weighted graph with 24 connected nodes and 36 segments.
- Segments marked `isBlocked: true` are completely excluded.
- Hazard exposure slows vehicle speed: Moderate (+35% penalty), Severe (+150% penalty), Critical (+400% penalty).
- Generates both primary safe routes and alternative detour routes (by penalizing primary segments).
- Compares disaster routes against normal baseline conditions.

### B. MCDA Resource Placement (`src/services/mcdaService.ts`)
- Configurable normalized criteria (0.0 to 1.0):
  - Demand Coverage (default 30%)
  - Accessibility (default 20%)
  - Healthcare Access Gap (default 15%)
  - Population Vulnerability (default 15%)
  - Logistics & Utilities (default 10%)
  - Hazard Safety (default 10%)
- **Critical Safety Constraint**: Sites marked Unsafe, Inundated, or Inaccessible receive a final score of 0 and are excluded with a detailed audit justification.
- Greedy spatial coverage selects non-overlapping zones to maximize protected population.

### C. Hospital Ranking (`src/services/hospitalService.ts`)
- Evaluates travel time, bed availability, emergency slots, and trauma/ICU capability.
- Saturated hospitals (0 available beds) or disconnected hospitals are immediately excluded.

---

## 4. End-to-End Demo Walkthrough

1. **Launch**: Open the dashboard to see live KPIs, open roads, and emergency requests across the city.
2. **Simulate a Flood**:
   - Go to **Disaster Scenarios** and select **Moderate River Flood Warning** (or move the Flood Severity slider).
   - Roads S14 (Sinhagad Underpass) and S5 (Yerawada low bridge) become blocked.
   - Low-lying candidate site `SITE-06` is automatically marked unsafe and excluded.
3. **Inspect Safe Routing**:
   - Open **Evacuation & Routing**; set Origin `N1` and Destination `N8`.
   - The router calculates an alternative detour bypassing blocked bridge S5.
   - Toggle individual road blockages to test how the system dynamically reroutes traffic.
4. **Dispatch Fleet**:
   - In **Emergency Requests**, click **Auto-Dispatch Fleet**.
   - Available ambulances are assigned to highest-priority critical incidents with calculated routes. No ambulance is double-booked.
5. **Optimize Temporary Resources**:
   - Go to **Temporary Resources** and select **Field Clinic**.
   - Click **Deploy Field Clinic** on the top-ranked safe site.
   - Toggle **Mark Unsafe** on any site to observe the critical safety exclusion rule in action.
6. **Track Inventory & Analytics**:
   - Review **Analytics & Reports** for bed utilization and fleet readiness.
   - Export incidents or sites to CSV, or generate a **Printable Decision Report**.
7. **Verify Acceptance Criteria**:
   - Go to **Settings & Data** and click **Run Automated Acceptance Tests** to run the 8 core automated tests.

---

## 5. Transitioning to Real-World Data (HDX / HOT / Live Telemetry)

To replace simulated Pune data with real-world geographic feeds in future phases:

1. **Road Networks**: Export municipal networks using the [HOT Export Tool](https://export.hotosm.org/) or OpenStreetMap Overpass API in GeoJSON format. Clean intersecting coordinates into graph edges compatible with `RoutingService.ts`.
2. **Healthcare Infrastructure**: Ingest hospital capacity and facility tiers from the [Humanitarian Data Exchange (HDX)](https://data.humdata.org/) WHO health facility dataset.
3. **Live Flood Telemetry**: Ingest river gauge measurements from the Central Water Commission (CWC) or USGS Water Services to dynamically set segment `floodDepthCm` and trigger automated road closures.
4. **Backend Optimizer**: Migrate Dijkstra and greedy MCDA services to Python (NetworkX, PuLP, FastAPI) for multi-million node municipal scale.

---

## 6. Safety Disclaimer

This software is an educational prototype and decision-support demonstration tool. It is **not certified for real-world emergency dispatch**. Real-world deployments require validated telemetry, verified local safety assessments, and human command signoff.
