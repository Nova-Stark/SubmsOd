# Brightloop Subscription Management System

Unified B2B Subscription, Billing, and Revenue Operations Platform built for recurring-revenue businesses (Stripe + Chargebee + Odoo architecture clone).

---

## Quick Navigation & Documentation

- **Setup & Installation**: [`SETUP_GUIDE.md`](file:///SETUP_GUIDE.md) — Step-by-step setup instructions for Backend, Frontend, and Calculation Engine.
- **User & Operations Guide**: [`HOW_TO_USE.md`](file:///HOW_TO_USE.md) — Complete walkthrough of roles, state machines, batch billing, and payment workflows.
- **Product Video Script**: [`DEMO_VIDEO_SCRIPT.md`](file:///DEMO_VIDEO_SCRIPT.md) — Timestamped demonstration script for feature presentations and video recordings.
- **Backend API & Developer Guide**: [`core/DEVELOPER_GUIDE.md`](file:///core/DEVELOPER_GUIDE.md) — Complete endpoint reference, schemas, and architecture blueprints.
- **Stateless Math Engine Demo**: [`DEMO.md`](file:///DEMO.md) — TypeScript pricing, tax, and discount calculation service demo requests.

---

## Architecture Overview

```
                      +-----------------------------+
                      | React 19 + Vite Frontend    |
                      | Port: 5173                  |
                      +--------------+--------------+
                                     |
                                     | (REST API / Bearer Token)
                                     v
                      +-----------------------------+
                      | Go + Gin Monolithic Core    |
                      | Port: 8080                  |
                      +--------------+--------------+
                                     |
                   +-----------------+-----------------+
                   |                                   |
                   v                                   v
    +-----------------------------+     +-----------------------------+
    | Embedded SQLite (GORM + WAL)|     | TypeScript Stateless Engine |
    | data/brightloop.db          |     | Port: 3000 (Calculations)   |
    +-----------------------------+     +-----------------------------+
```

---

## 30-Second Quickstart

### 1. Launch Go Backend
```bash
cd core
go run cmd/main.go
```
*API online on `http://localhost:8080`. Auto-seeds 347 fixture records if DB is empty.*

### 2. Launch React Frontend
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in browser.*

---

## Test Suites & Verification

- **Backend Tests (Zero data races)**:
  ```bash
  cd core && go test -race ./tests/...
  ```
- **Calculation Engine Tests**:
  ```bash
  npm run test
  ```
- **Frontend Production Build**:
  ```bash
  cd frontend && npm run build
  ```
