# AssetFlow — Enterprise Asset & Resource Management System

AssetFlow is a self-contained, enterprise-grade asset and resource management platform designed to track the entire lifecycle of physical and digital assets within an organization. The system enables seamless role-based administration of departments and employee directories, handles conflict-free asset allocation and transfers, schedules overlap-proof resource bookings, manages end-to-end maintenance approval workflows, organizes periodic audit cycles, and visualizes live operations via a realtime WebSocket-backed KPI dashboard.

## Key Features

* **Role-Based Access Control (RBAC):** Granular permissions for Administrators, Asset Managers, Department Heads, and Employees.
* **Hierarchical Organization Setup:** Structure departments with parent-child relationships, complete with automatic loop prevention.
* **Strict Asset Lifecycle Tracking:** An authoritative state machine governing transitions across all asset states (Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed).
* **Conflict-Free Asset Allocation:** Database-level constraints that block double-allocation of any asset at the storage layer.
* **Overlap-Proof Resource Booking:** PostgreSQL GIST exclusion constraints that prevent double-booking of shared assets for overlapping time slots.
* **Maintenance Approval Workflows:** Automated transitions that flip assets to *Under Maintenance* upon request approval, and restore them upon resolution.
* **Scheduled Audit Cycles:** Cycle-based physical verification that snapshots inventory and flags discrepancies like missing or damaged items.
* **Realtime KPI Dashboard:** Operational metrics, return warnings, and notifications that update instantly via WebSockets without page refreshes.
* **Command Palette (⌘K / Ctrl+K):** A global search interface allowing users to quickly look up assets, people, and bookings, and trigger actions.
* **Asset Health Index:** A dynamic 0–100 score computed at read time using age, condition, and maintenance load to identify at-risk items.

## Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Backend API** | NestJS (Node 20) | Modular architecture, TypeScript native, built-in validation, DI, and guards. |
| **ORM** | Prisma | Typed database client and versioned migration runner. |
| **Database** | PostgreSQL 16 | Relational storage enforcing all business-critical invariants via native constraints. |
| **Frontend** | React 18 + Vite | Single Page Application (SPA) powered by Tailwind CSS, TypeScript, and TanStack Query. |
| **Realtime Gateway** | Socket.IO | Bi-directional, event-based communication for dashboards and notifications. |
| **Containerization** | Docker | Self-contained local orchestration (e.g., PostgreSQL service container). |

## Project Structure

```
├── client/          # React SPA (Vite + TypeScript + Tailwind)
├── server/          # NestJS REST & WebSocket API (Prisma + PostgreSQL)
└── docs/            # Engineering and requirements documentation
```

## Getting Started

Follow these steps to run the application locally:

### 1. Database Setup
Spin up the PostgreSQL database container:
```bash
docker compose up -d db
```

### 2. Backend Server Setup
Navigate to the server directory, install dependencies, run migrations, seed the database, and start the development server:
```bash
cd server
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

### 3. Frontend Client Setup
In a new terminal window, navigate to the client directory, install dependencies, and start the frontend development server:
```bash
cd client
npm install
npm run dev
```

The client will be accessible at `http://localhost:5173`, and the server API at `http://localhost:3000/api/v1` (with Swagger documentation available at `/api/docs`).

## Documentation

For deep dives into the system design, consult the following engineering documents:

* [01-REQUIREMENTS.md](docs/01-REQUIREMENTS.md) — Product purpose, roles, functional requirements, and platform differentiators.
* [02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md) — High-Level Design (HLD), ADRs, module mapping, and request lifecycle flows.
* [03-DATABASE-DESIGN.md](docs/03-DATABASE-DESIGN.md) — Database schema, SQL integrity constraints, sequence tagging, and lifecycle state tables.
* [04-LLD.md](docs/04-LLD.md) — Low-Level Design (LLD), REST endpoint catalog, DTO validation, and Socket.IO contracts.
* [05-GIT-WORKFLOW.md](docs/05-GIT-WORKFLOW.md) — Trunk-based branch model, commit formatting standards, and release tags.
* [06-TESTING-STRATEGY.md](docs/06-TESTING-STRATEGY.md) — Unit, integration, and E2E testing plans, coverage expectations, and command references.

## License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details. Copyright &copy; 2026 AssetFlow Team.
