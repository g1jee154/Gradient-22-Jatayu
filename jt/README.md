# 🛡️ JATAYU — Unified Personal Safety & Rapid Emergency Response Platform

> **Build Beyond Hackathon** · Problem Statement 3.1: Unified Personal Safety & Emergency Response Platform.  
> Fully functional end-to-end full-stack emergency response network connecting citizens in distress with nearby verified responders, trusted contacts, and dispatchers in real time.

---

## 🌟 Highlights & Architecture

- **Autonomous Full-Stack Backend**: High-performance Node.js server powered by Express, persistent SQLite (`node:sqlite`), and bidirectional WebSockets (`ws`).
- **Real-Time Dispatch Engine**: Sub-second synchronization across all connected devices and browser tabs when SOS is triggered, accepted, or updated.
- **Turn-by-Turn Response & Navigation**: Interactive OpenStreetMap / Leaflet maps with vector routing, dynamic ETA estimation, and 1-tap Google Maps turn-by-turn navigation.
- **Role-Based Control Centers**:
  1. **Citizen App (`/user`)**: Instant 1-tap SOS beacon, emergency type selection, live telemetry, trusted contacts management, and SMS escalation simulation.
  2. **Active Incident Command (`/incident/:id`)**: Live incident tracking with real-time status pulses, responder vehicle telemetry, dynamic ETA, event timeline, and **live chat between victim and responder**.
  3. **Responder Console (`/responder`)**: Real-time distress call alerts, audio chimes, distance/ETA calculation, 1-tap Accept/Decline, Google Maps navigation, live status advancement (`En route` → `On scene` → `Resolve`), and field reports.
  4. **Command Center Administration (`/admin`)**: Live city-wide incident & responder map, manual dispatch overrides, responder verification/revocation, user directory controls, and **tamper-evident cryptographically chained audit logs**.

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Full Stack (Single Command)
```bash
npm run dev
```
- **Web Application**: [http://localhost:5173](http://localhost:5173) (Vite Dev Server with API Proxy)
- **Backend API & WebSockets**: [http://localhost:5050](http://localhost:5050) / `ws://localhost:5050/ws`

### 3. Or Run Production Standalone Server
```bash
npm run build
npm start
```
- Serves both API and frontend on [http://localhost:5050](http://localhost:5050).

---

## 🔑 Pre-Seeded Demo Accounts (1-Click Login Available)

All demo accounts have password `password123`. You can also click the **Instant 1-Click Demo Login** buttons on the Landing and Login pages:

| Role | Name | Email | Password | Details |
|---|---|---|---|---|
| **Citizen** | Aarav Sharma | `aarav@jatayu.org` | `password123` | Indiranagar, 3 trusted contacts |
| **Police Responder** | Officer Arjun Kumar | `arjun@jatayu.org` | `password123` | Badge: `BLR-POL-4412`, Online |
| **Paramedic Responder** | Dr. Meera Nair | `meera@jatayu.org` | `password123` | Badge: `EMS-BLR-089`, Online |
| **Fire & Rescue** | Vikram Singh | `vikram@jatayu.org` | `password123` | Badge: `FRS-KA-201`, Online |
| **Command Chief Admin** | Priya | `admin@jatayu.org` | `password123` | Full dispatcher authority |

---

## 🚀 Live Demo Walkthrough (Multi-Window or Multi-Tab)

To see the real-time backend synchronization in action:

1. **Open Tab A (Citizen)**:
   - Navigate to [http://localhost:5173](http://localhost:5173) and click **"Launch Citizen App"** (or log in as `aarav@jatayu.org`).
   - Notice current GPS location and nearby responders.
   - Click the large red **SOS** button.
   - You will be redirected immediately to the active incident screen (`/incident/JTY-XXXX`).

2. **Open Tab B (Responder)**:
   - In an incognito tab or second browser, open [http://localhost:5173/login](http://localhost:5173/login) and click **"Login as Responder (Officer Arjun)"**.
   - Notice the audio alert and incoming emergency card appear in real-time under **"Incoming Emergency Broadcasts"**!
   - Click **"Accept Emergency →"**.
   - Watch Tab A immediately update to show Officer Arjun Kumar assigned, with estimated arrival time and distance line on the map!

3. **Coordinate & Chat**:
   - In Tab B (Responder), click **"1. Mark En Route →"**.
   - Send a chat message: *"Patrol unit en route. Stay safe."*
   - In Tab A (Citizen), see the chat message arrive instantly without refreshing!
   - Reply as Citizen: *"Thank you, I am near the metro gate."*

4. **Resolve & Audit**:
   - In Tab B (Responder), click **"2. Mark On Scene →"**, then **"3. Resolve Incident ✓"**.
   - Enter field report: *"Citizen escorted safely."*
   - In Tab C (Admin): Log in as Admin (`admin@jatayu.org`) and check the **Tamper-Evident Audit Ledger** to see every single action cryptographically verified with its chained hash!

---

## 🗄️ Database & API Schema

The project includes a persistent SQLite database (`server/data/jatayu.db`) using native `node:sqlite`:

### Core Endpoints:
- `POST /api/auth/register` — Create account with role (`user`, `responder`, `admin`)
- `POST /api/auth/login` — Sign in with JWT tokens
- `POST /api/auth/demo-login` — 1-Click fast login for judges
- `GET /api/auth/me` — Verify session profile
- `POST /api/incidents` — Broadcast SOS alert with coordinates & emergency type
- `GET /api/incidents/my` — User's incident history
- `GET /api/incidents/pending` — Incoming emergencies queue for responders
- `GET /api/incidents/assigned` — Incidents assigned to responder
- `GET /api/incidents/:id` — Full incident telemetry, timeline, and messages
- `POST /api/incidents/:id/accept` — Responder accepts emergency
- `PATCH /api/incidents/:id/status` — Lifecycle transitions (`En route`, `On scene`, `Resolved`)
- `POST /api/incidents/:id/cancel` — Cancel emergency with reason
- `POST /api/incidents/:id/dispatch` — Admin manual responder dispatch
- `GET/POST /api/incidents/:id/messages` — Real-time live emergency chat
- `GET /api/responders` — Available responders with GPS coordinates
- `PATCH /api/responders/availability` — Toggle online/offline status
- `PATCH /api/responders/:id/verify` — Admin approves/revokes responders
- `GET/POST/DELETE /api/contacts` — Manage trusted emergency contacts
- `POST /api/contacts/alert` — Simulate SMS alert broadcast to contacts
- `GET /api/admin/stats` — Platform KPI metrics
- `GET /api/admin/users` — User directory & suspend/reinstate controls
- `GET /api/admin/audit-logs` — Tamper-evident cryptographic ledger

---

## 🧪 Testing

Run the automated end-to-end integration test suite:
```bash
node server/test_e2e.js
```
