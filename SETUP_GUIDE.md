# Brightloop Setup Guide

Complete instructions to install dependencies, configure, and run the Brightloop Subscription Management System across all layers: Backend (`core/`), Frontend (`frontend/`), and Business Logic Engine (`src/`).

---

## 1. System Requirements & Prerequisites

- **Go**: Version `1.22+` ([golang.org](https://go.dev/dl/))
- **Node.js**: Version `18.0.0+` or `20.x+` with `npm 9+` ([nodejs.org](https://nodejs.org/))
- **OS**: Windows, macOS, or Linux (Zero CGO required; uses pure Go SQLite).
- **Ports Used**:
  - `8080`: Go Gin Core API Backend
  - `5173`: React + Vite Frontend
  - `3000`: (Optional) Stateless TypeScript calculation engine

---

## 2. Quickstart (One-Command-Per-Terminal)

### Terminal 1: Backend (`core/`)
```bash
# Navigate to core
cd core

# Run the API server (automatically initialises data/brightloop.db and auto-seeds 347 records)
go run cmd/main.go
```
> The API will boot on `http://localhost:8080`.
> Health check: `http://localhost:8080/health`

### Terminal 2: Frontend (`frontend/`)
```bash
# Navigate to frontend
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```
> Open your browser at `http://localhost:5173`.

### Terminal 3 (Optional): TypeScript Engine (`src/`)
```bash
# From repository root
npm install
npm run build
npm start
```
> Listens on `http://localhost:3000` for stateless math / PDF evaluation.

---

## 3. Seeded Accounts & Credentials

The database automatically seeds with default test users upon first run:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@brightloop.local` | `Admin@Brightloop2026!` | Full platform control, Staff creation, Catalog/Plans, Analytics, Fixtures |
| **Staff** | `staff@brightloop.local` | `Staff@Brightloop2026!` | Sales quotes, Contracts, Invoicing, Payment recording, Overdue reports |
| **Customer** | `customer1@brightloop-client.com` | `ClientPass123!` | Self-service portal: view own contracts, approve quotes, invoices, print receipts |

---

## 4. Frontend Environment Configuration

The frontend configuration resides in [`frontend/src/config/env.ts`](file:///frontend/src/config/env.ts).

You can customize it via a `.env` or `.env.local` file inside `frontend/`:

```env
# URL pointing to the Go Gin Backend
VITE_API_URL=http://localhost:8080/api/v1

# Set to 'false' to use the real Go backend, 'true' for standalone mock
VITE_USE_MOCK=false

# Token storage mode ('localStorage' or 'cookie')
VITE_AUTH_STORAGE=localStorage

# Default currency display
VITE_DEFAULT_CURRENCY=INR
```

---

## 5. Verification & Test Suites

To verify that all systems, state machines, and mathematical engines are 100% operational:

### 1. Backend Verification (`core/`)
```bash
cd core

# Run all unit and integration tests
go test -v ./tests/...

# Run race detector to verify zero SQLite locking deadlocks
go test -race ./tests/...
```

### 2. Calculation Engine Verification (`src/`)
```bash
# From root
npm run typecheck
npm test
```

### 3. Frontend Production Build Check (`frontend/`)
```bash
cd frontend
npm run build
```

---

## 6. Common Troubleshooting

1. **`SQLITE_BUSY` or Database Locked**:
   - The Go backend manages database connections using single-writer thread pool (`SetMaxOpenConns(1)`) and WAL mode with a 5000ms busy timeout. Avoid opening `data/brightloop.db` in external GUI tools with exclusive locks while tests or servers are writing.
2. **CORS Errors**:
   - CORS is enabled on the Go backend for `http://localhost:5173` and `http://localhost:3000`. Ensure your frontend is running on standard Vite port `:5173`.
3. **Database Reset**:
   - To completely reseed the database from scratch, stop the Go backend and delete `core/data/brightloop.db`. On next launch, `main.go` will automatically rebuild schema and re-load all 347 fixture records.
