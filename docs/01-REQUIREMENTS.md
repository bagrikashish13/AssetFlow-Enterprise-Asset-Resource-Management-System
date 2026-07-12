# AssetFlow — Software Requirements Specification (SRS)

> Doc 1 of 6 · Source of truth for WHAT we build. See `02-HLD.md` for HOW.

## 1. Purpose & Scope

AssetFlow is an Enterprise Asset & Resource Management System: departments, employees, asset lifecycle tracking, allocation with conflict rules, time-slot resource booking, maintenance approval workflow, audit cycles, notifications, and analytics.

**Out of scope (explicit non-goals):** purchasing, invoicing, accounting. Acquisition cost is stored for ranking/reports only.

## 2. Actors & Roles

| Role | Capabilities |
|---|---|
| **Admin** | Org setup (departments, categories, employee directory), promotes roles, manages audit cycles, org-wide analytics |
| **Asset Manager** | Registers/allocates assets, approves transfers + maintenance + returns + audit discrepancy resolution |
| **Department Head** | Views department assets, approves allocation/transfer requests in own department, books resources for department |
| **Employee** | Views own assets, books shared resources, raises maintenance requests, initiates return/transfer |

**Security invariant (SR-1):** Signup creates an Employee account only. Roles are assigned exclusively by Admin from the Employee Directory. No self-elevation anywhere.

## 3. Functional Requirements

Priority: **P0** = core, **P1** = second wave. **Everything gets built** — priority defines build order only, not cut lines.

### FR-1 Auth (P0)
- FR-1.1 Signup with name, email, password → always role `EMPLOYEE`.
- FR-1.2 Login with email + password → JWT session; `/auth/me` session validation.
- FR-1.3 Password reset: Admin resets from Employee Directory (deliberate choice — no external email API, see NFR-2).

### FR-2 Organization Setup (P0, Admin only)
- FR-2.1 Departments: create/edit/deactivate; assign Department Head; optional parent department (hierarchy); Active/Inactive status.
- FR-2.2 Asset Categories: create/edit; optional category-specific custom fields (JSONB, e.g. warranty period).
- FR-2.3 Employee Directory: list/search; edit department, status; **promote to Department Head / Asset Manager (only place roles change)**.

### FR-3 Asset Registry (P0)
- FR-3.1 Register asset: name, category, auto-generated tag `AF-0001`…, serial number, acquisition date + cost, condition, location, photo upload, `is_bookable` flag.
- FR-3.2 Search/filter by tag, serial, category, status, department, location.
- FR-3.3 Lifecycle states: Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed — transitions enforced by a state machine (see `04-LLD.md` §5).
- FR-3.4 Per-asset history: allocations + maintenance, chronological.

### FR-4 Allocation & Transfer (P0)
- FR-4.1 Allocate asset to employee or department, optional Expected Return Date.
- FR-4.2 **Conflict rule:** allocating an already-allocated asset is blocked at DB level; UI shows current holder and offers "Request Transfer" instead.
- FR-4.3 Transfer workflow: Requested → Approved (Asset Manager / Dept Head) → auto re-allocation, history updated.
- FR-4.4 Return flow: mark returned + condition check-in notes → asset back to Available.
- FR-4.5 Overdue allocations (past Expected Return Date) auto-flagged → dashboard + notification.

### FR-5 Resource Booking (P0)
- FR-5.1 Calendar view of a resource's bookings.
- FR-5.2 **Overlap rule:** overlapping time slots for the same resource are rejected — enforced by a PostgreSQL EXCLUDE constraint AND a friendly service-level check. Back-to-back (10:00 end / 10:00 start) is allowed.
- FR-5.3 Booking status: Upcoming, Ongoing, Completed, Cancelled (derived from time + cancellation).
- FR-5.4 Cancel / reschedule; reminder notification before slot start.

### FR-6 Maintenance (P0)
- FR-6.1 Raise request: asset, issue description, priority, optional photo.
- FR-6.2 Workflow: Pending → Approved/Rejected (Asset Manager) → Technician Assigned → In Progress → Resolved.
- FR-6.3 Asset auto-flips to Under Maintenance on approval, back to Available on resolution.
- FR-6.4 Maintenance history per asset.

### FR-7 Audit Cycles (P1)
- FR-7.1 Admin creates cycle: name, scope (department/location), date range; assigns auditor(s).
- FR-7.2 Auditor marks each in-scope asset: Verified / Missing / Damaged (+ notes).
- FR-7.3 Auto-generated discrepancy report for Missing/Damaged.
- FR-7.4 Close cycle → locks records, updates asset statuses (confirmed missing → Lost).

### FR-8 Dashboard & Notifications (P0)
- FR-8.1 KPI cards: Assets Available, Assets Allocated, Maintenance Today, Active Bookings, Pending Transfers, Upcoming Returns — **live-updating via WebSocket**.
- FR-8.2 Overdue returns highlighted separately from upcoming.
- FR-8.3 Quick actions: Register Asset, Book Resource, Raise Maintenance Request.
- FR-8.4 In-app notifications: Asset Assigned, Maintenance Approved/Rejected, Booking Confirmed/Cancelled/Reminder, Transfer Approved, Overdue Return, Audit Discrepancy.
- FR-8.5 Activity log: who did what, when — every mutating action recorded.

### FR-9 Reports & Analytics (P1)
- FR-9.1 Asset utilization: most-used vs idle.
- FR-9.2 Maintenance frequency by asset/category.
- FR-9.3 Department-wise allocation summary.
- FR-9.4 Booking heatmap (peak usage windows).
- FR-9.5 CSV export.

### FR-10 Platform Differentiators (P1)
- FR-10.1 **Command palette** (⌘K / Ctrl+K): global fuzzy search across assets, people, departments, bookings + quick actions.
- FR-10.2 **Asset QR labels**: printable QR per asset (encodes asset tag); audit screen supports scan/enter-tag to mark records verified.
- FR-10.3 **Smart slot suggestions**: a rejected overlapping booking returns the next three free slots for the requested duration.
- FR-10.4 **Asset Health Index**: deterministic 0–100 score from condition, age, and maintenance load; bands (Healthy / Monitor / At Risk) drive retirement and at-risk reporting.

## 4. Non-Functional Requirements

| # | Requirement | How we satisfy it |
|---|---|---|
| NFR-1 | **Database integrity first** | Constraints live in PostgreSQL, not just app code: partial unique index (one active allocation per asset), EXCLUDE constraint (no booking overlap), FKs, enums, CHECK constraints |
| NFR-2 | **Minimal third-party APIs** | Zero external SaaS. Auth = self-hosted JWT + bcrypt. Files = local disk. Notifications = in-app via Socket.IO. Only open-source libraries |
| NFR-3 | **Realtime** | Socket.IO pushes notifications + dashboard KPI invalidations on every relevant mutation |
| NFR-4 | **Robust validation** | class-validator DTOs on every endpoint via global `ValidationPipe` (whitelist + forbidNonWhitelisted); DB constraints as last line |
| NFR-5 | **Security** | bcrypt password hashing, JWT expiry (httpOnly cookie), `RolesGuard` on every route, no self-elevation, Prisma = parameterized queries (no SQL injection) |
| NFR-6 | **Scalability & modularity** | NestJS modular monolith — one module per domain, DI everywhere, controller → service → Prisma layering, stateless API (horizontal-scale ready) |
| NFR-7 | **Performance** | Indexed FKs + status columns, pagination on all lists, aggregate SQL for reports |
| NFR-8 | **Usability** | Consistent design system (one palette, shared components), responsive layout |

## 5. Requirements Traceability

| Requirement area | Design authority | Verification |
|---|---|---|
| Data model, conflict invariants (FR-4.2, FR-5.2) | `03-DATABASE-DESIGN.md` (constraints C1–C9, state machines) | integration tests, `06-TESTING-STRATEGY.md` §3 |
| System structure, security, realtime (NFR-1…8) | `02-ARCHITECTURE.md` (ADRs, module map, security architecture) | E2E security assertions, CI gates |
| API behavior, workflows, validation | `04-LLD.md` (endpoint catalog, DTO rules, sequences) | unit + E2E suites |
| UI/UX, screens, design system | `DESIGN-PROMPT.md` (tokens, components, screen specs) | §7 quality-bar checklist |
| Change management | `05-GIT-WORKFLOW.md` | PR gates |
