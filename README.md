# Brightloop Revenue Operations & Subscription Management Platform

Brightloop is an enterprise-grade, unified B2B Subscription, Billing, and Revenue Operations platform engineered for recurring-revenue businesses. Built as a high-performance monolithic architecture in Go with an embedded, concurrency-hardened SQLite storage layer, Brightloop delivers sub-2-millisecond ledger queries, deterministic recurring batch billing, multi-variant pricing, and rigorous role-based access control.

---

## Documentation Index

- **Setup & Getting Started**: [`SETUP_GUIDE.md`](file:///SETUP_GUIDE.md) — Comprehensive environment preparation, dependencies, and execution guide.
- **Operations & User Manual**: [`HOW_TO_USE.md`](file:///HOW_TO_USE.md) — End-to-end workflow documentation covering contract lifecycles, payments, and self-service.
- **Product Demonstration Script**: [`DEMO_VIDEO_SCRIPT.md`](file:///DEMO_VIDEO_SCRIPT.md) — Timed, scene-by-scene script designed for product presentations and walkthrough videos.
- **Core API & Architecture Guide**: [`core/DEVELOPER_GUIDE.md`](file:///core/DEVELOPER_GUIDE.md) — Low-level endpoint specifications, schema designs, and implementation standards.
- **Stateless Calculation Service**: [`DEMO.md`](file:///DEMO.md) — TypeScript pricing, tax, and discount evaluation service specifications.

---

## Architectural Topology

The platform consists of a single-binary Go backend serving a Gin REST API backed by an embedded SQLite engine with Write-Ahead Logging (WAL), paired with a React 19 single-page application and a stateless TypeScript math evaluation sidecar.

```
                      +-----------------------------+
                      | React 19 + Vite Frontend    |
                      | Port: 5173                  |
                      +--------------+--------------+
                                     |
                                     | REST API (JSON / Bearer Token)
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
    | data/brightloop.db          |     | Port: 3000                  |
    +-----------------------------+     +-----------------------------+
```

---

## Key Platform Capabilities

### 1. High-Performance Monolithic Core
- **Pure Go SQLite Implementation**: Eliminates CGO compilation overhead and external database service dependencies using `modernc.org/sqlite` via `glebarez/sqlite`.
- **Concurrency & Ledger Safety**: Hardened with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`), a 5,000ms busy timeout, and a single-writer connection pool (`SetMaxOpenConns(1)`).
- **Sub-2-Millisecond Response Latency**: Core analytics and aging ledger evaluations process on in-memory indices without external caching overhead.

### 2. Contract Finite State Machine (FSM)
Subscriptions transition through a strict, deterministic state machine:

```
[ DRAFT ] ---> [ QUOTATION ] ---> [ CONFIRMED ] ---> [ ACTIVE ] <---> [ PAUSED ]
                     |                  |                 |
                     v                  v                 v
                 [ CLOSED ]         [ CLOSED ]        [ CLOSED ]
```

- **Draft**: Initial contract creation with multi-variant catalog line items.
- **Quotation**: Activated with deterministic validity windows (default 30 days).
- **Confirmed**: Accepted by customer or sales agent.
- **Active**: Commences recurring billing cycle.
- **Paused / Resumed**: Governed by plan-specific permission flags (`AllowPause`).
- **Closed**: Enforces early-cancellation policies (`AllowEarlyClose`).

### 3. Idempotent Recurring Batch Billing
- **Guaranteed Ledger Integrity**: Billing runs evaluate all active contracts against current timestamps.
- **Composite Unique Indexing**: Invoices enforce `UNIQUE(subscription_id, billing_period_start)`. Redundant execution calls never generate duplicate invoices.
- **Proration & Cycle Computation**: Supports `MONTHLY` and `YEARLY` cadence calculations with automatic due-date offsets.

### 4. Precision Financial Arithmetic
- **Integer Minor Units**: All monetary values (prices, taxes, discounts, line subtotals, balances) are stored and computed strictly as 64-bit signed integers (`int64` cents/paise). Floating-point rounding drift is mathematically impossible.

### 5. Multi-Method Payment Settlement & Invoicing
- **Multi-Method Logging**: Supports `BANK_TRANSFER`, `CREDIT_CARD`, `UPI`, `CASH`, and `CHEQUE`.
- **Automatic Status Settlement**: Balance due recalculates in real-time. Invoices automatically transition to `PAID` once the balance reaches zero.
- **Compliant Print Views**: Built-in HTML invoice generator ready for browser printing and PDF archiving.

### 6. Role-Based Access Control (RBAC) & Portal Isolation
- **Admin**: Full authority over product catalog, pricing plans, discount rules, staff management, and system fixtures.
- **Staff**: Operational authority over quotation generation, contract lifecycles, batch billing runs, and payment logging.
- **Customer**: Dedicated, scoped self-service portal (`/portal/subscriptions`, `/portal/invoices`). Any unauthorized attempt to call administrative routes triggers immediate `403 Forbidden` barriers.

---

## Default System Credentials

Upon initialization, the database automatically ingests deterministic fixture data (`347` total records) if empty:

| Role | Email Address | Password | Intended Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@brightloop.local` | `Admin@Brightloop2026!` | Global configuration, catalog, staff, analytics |
| **Staff Member** | `staff@brightloop.local` | `Staff@Brightloop2026!` | Sales, quotation conversion, billing execution |
| **Customer** | `customer1@brightloop-client.com` | `ClientPass123!` | Customer self-service portal and invoice review |

---

## Quickstart Guide

### Prerequisites
- Go 1.22+
- Node.js 18+ and npm 9+

### Step 1: Start Backend
```bash
cd core
go run cmd/main.go
```
*Backend initializes on `http://localhost:8080`. Automatic health check available at `/health`.*

### Step 2: Start Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend interface initializes on `http://localhost:5173`.*

### Step 3 (Optional): Start TypeScript Engine
```bash
npm install
npm run build
npm start
```
*Stateless calculation service initializes on `http://localhost:3000`.*

---

## Verification & Test Execution

Brightloop is covered by comprehensive unit, integration, and stress tests:

```bash
# Execute core test suite with Go Race Detector
cd core
go test -v -race ./tests/...

# Execute calculation engine test suite
npm run test

# Execute frontend production build
cd frontend
npm run build
```

---

## Technology Stack

- **Backend Runtime**: Go 1.22
- **Web Framework**: Gin Web Framework (`github.com/gin-gonic/gin`)
- **Object Relational Mapper**: GORM (`gorm.io/gorm`)
- **Database Driver**: Glebarez Pure Go SQLite (`github.com/glebarez/sqlite`)
- **Authentication**: Bcrypt + JWT (HS256)
- **Frontend Framework**: React 19, TypeScript, Vite
- **Styling & UI**: Tailwind CSS, Lucide React, TanStack Query
- **Calculation Sidecar**: TypeScript, Express, Zod, Vitest
