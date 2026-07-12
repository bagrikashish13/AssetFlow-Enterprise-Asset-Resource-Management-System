# AssetFlow — System Architecture (HLD)

## 1. System context

```
┌────────────────────────────────────────────────────────────────────┐
│                            Browser (SPA)                           │
│   React 18 + TypeScript + Vite · Tailwind · TanStack Query         │
│   custom component library · custom SVG charts · Socket.IO client  │
└──────────────┬─────────────────────────────┬───────────────────────┘
               │ HTTPS REST /api/v1          │ WebSocket (Socket.IO)
┌──────────────▼─────────────────────────────▼───────────────────────┐
│                        API — NestJS (Node 20)                      │
│  Guards (JWT · Roles) → Pipes (validation) → Controllers →         │
│  Services (domain logic · state machines) → Prisma → PostgreSQL    │
│  Cross-cutting: exception filter · activity-log interceptor ·      │
│  events gateway · schedulers (overdue / reminders / reservations)  │
└──────────────┬─────────────────────────────────────────────────────┘
               │ Prisma (pooled)
┌──────────────▼───────────────┐   ┌───────────────────────────────┐
│  PostgreSQL 16 (Docker)      │   │  Local volume: /uploads       │
│  constraints = source of     │   │  (asset & maintenance photos) │
│  truth for conflict rules    │   └───────────────────────────────┘
└──────────────────────────────┘
```

**Self-contained by design:** no external SaaS, no third-party APIs. Authentication, file storage, notifications, and realtime are all in-process or in-cluster. The system runs fully offline.

## 2. Technology decisions (ADR summary)

| # | Decision | Rationale | Alternatives rejected |
|---|---|---|---|
| ADR-1 | NestJS modular monolith | Enforced module boundaries, DI, guards/pipes/interceptors give SOLID structure without microservice overhead; single deployable | Express (structure by convention only), microservices (operational cost unjustified at this scale) |
| ADR-2 | PostgreSQL + Prisma | Relational integrity (partial unique indexes, exclusion constraints) is the core of the domain; Prisma gives typed access + versioned migrations | MongoDB (no declarative overlap/uniqueness constraints), raw SQL (loses type safety) |
| ADR-3 | DB-level conflict enforcement | Double-allocation and booking-overlap are correctness invariants → must hold under concurrency and future code changes; app-level checks alone are race-prone | validate-then-insert without constraints |
| ADR-4 | JWT in httpOnly cookie (SameSite=Strict) + bcrypt | Stateless horizontal scaling; XSS cannot read the token; CSRF mitigated by SameSite | server sessions (sticky state), localStorage tokens (XSS-exposed) |
| ADR-5 | Socket.IO gateway in-process | Realtime KPIs + notifications with zero extra infrastructure; DI-shared with services | polling (waste, latency), SSE (no rooms/acks) |
| ADR-6 | Derived state over stored state | Booking phase, overdue flags, health score computed at read time — cannot go stale | status-flipping cron for phases (drift risk) |
| ADR-7 | Custom SVG charts + custom calendar | Zero heavy dependencies, exact design-system fit, full control of status color semantics | charting libs (bundle + theming mismatch) |
| ADR-8 | Local disk uploads behind static route | No cloud dependency; swap to object storage later behind the same `StorageService` interface | S3-compatible SaaS |

## 3. Module decomposition (NestJS)

```
server/src/
  main.ts                 # bootstrap: helmet, CORS allowlist, global pipes/filters, Swagger
  app.module.ts
  config/                 # typed env config, validated at boot (fail-fast)
  common/                 # cross-cutting, domain-agnostic
    guards/               #   JwtAuthGuard, RolesGuard
    decorators/           #   @Roles(), @CurrentUser(), @Public()
    filters/              #   GlobalExceptionFilter → error envelope
    interceptors/         #   ActivityLogInterceptor, TransformInterceptor
    pipes/                #   ParseUUIDPipe usage, pagination pipe
    dto/                  #   PaginationQueryDto, IdParamDto
  prisma/                 # PrismaModule (global), PrismaService
  modules/
    auth/                 # signup (EMPLOYEE only), login, logout, me
    users/                # directory, role assignment, status, password reset
    departments/          # CRUD + hierarchy validation
    categories/           # CRUD + custom field definitions
    assets/               # registry, search, lifecycle, history, health score
      asset-state.machine.ts   # single authority for status transitions
    allocations/          # allocate, return, conflict detection
    transfers/            # request → approve/reject/cancel (transactional re-allocation)
    bookings/             # slots, overlap handling, availability, suggestions
    maintenance/          # approval workflow → asset status side effects
    audits/               # cycles, snapshot records, close-out effects
    notifications/        # fan-out + read state
    activity/             # append-only log queries
    dashboard/            # KPI aggregates
    reports/              # SQL aggregate endpoints + CSV export
    events/               # Socket.IO gateway (rooms: user:{id}, role:{ROLE})
    scheduler/            # overdue scanner, booking reminders, reservation flips
    storage/              # StorageService (local disk impl), multer config
```

**Dependency rule:** modules depend on `common/` and `prisma/`, never on each other's internals — cross-module effects go through exported services (e.g. `MaintenanceService` calls `AssetStateMachine`, `NotificationsService`, `EventsGateway`).

## 4. Request lifecycle (every mutating call)

```
HTTP → Helmet/CORS → Throttler (auth routes)
  → JwtAuthGuard (identity)   → RolesGuard (@Roles metadata)
  → ValidationPipe (whitelist + forbidNonWhitelisted + transform DTO)
  → Controller (thin: DTO in, service out)
  → Service (business rules, state machine, $transaction)
  → Prisma → PostgreSQL (constraints = last line of defense)
  ← TransformInterceptor (response envelope)
  ← ActivityLogInterceptor (append audit row + emit socket events)
  ← GlobalExceptionFilter (typed error envelope, Prisma error mapping)
```

Prisma error mapping is centralized: `P2002` (unique) → domain-specific 409 (e.g. `ALLOCATION_CONFLICT`), exclusion violation `23P01` → `BOOKING_OVERLAP` with slot suggestions, `P2025` → 404. Constraint violations therefore surface as friendly, typed API errors even if a service-level pre-check is bypassed by a race.

## 5. Realtime architecture

- Gateway authenticates the socket handshake with the same JWT; sockets join `user:{id}` and `role:{ROLE}` rooms.
- Services emit **after commit**, via a thin `DomainEventsService` (single emit surface):

| Event | Rooms | Trigger |
|---|---|---|
| `notification:new` | `user:{id}` | any notification insert |
| `kpi:invalidate` | all authenticated | allocation/booking/maintenance/transfer mutations |
| `asset:updated` | all | status/detail changes |
| `booking:changed` | all | create/cancel/reschedule |
| `transfer:updated` | requester, approvers | workflow steps |
| `maintenance:updated` | raiser, managers | workflow steps |

- Client maps events → TanStack Query invalidations: dashboards and lists update live without refresh (two-browser demo works out of the box).
- Scale path: Socket.IO Redis adapter drops in when horizontal scaling is needed — no API change.

## 6. Security architecture

| Layer | Control |
|---|---|
| Account creation | Signup hard-codes the `EMPLOYEE` role (request cannot influence it); role changes only via `PATCH /users/:id/role` behind `@Roles(ADMIN)` — no self-elevation path exists |
| Authentication | bcrypt (cost 12) · JWT (15 min–8 h) in httpOnly, Secure, SameSite=Strict cookie · logout clears cookie · inactive users rejected at guard |
| Authorization | `RolesGuard` on every non-public route + resource-level ownership checks in services (e.g. employees see own allocations; dept heads scoped to their department) |
| Input | Global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform) — unknown fields rejected, types coerced, every DTO rule explicit; UUID params validated; pagination capped (`limit ≤ 100`) |
| Injection | Prisma parameterized queries only; no string-built SQL (raw report queries use tagged templates with bound params) |
| Uploads | Multer: 5 MB cap, mimetype + extension allowlist (images only), randomized filenames, served statically without execution |
| Transport/headers | Helmet defaults, strict CORS allowlist (client origin only, credentials mode), rate limiting on `/auth/*` |
| Secrets | `.env` (git-ignored) + `.env.example`; config schema validated at boot — missing/invalid env fails fast |
| Traceability | Append-only `activity_logs` via interceptor: actor, action, entity, timestamp for every mutation |

## 7. SOLID mapping

| Principle | Where it shows |
|---|---|
| **S** — single responsibility | Controllers route, DTOs validate shape, services own one domain each, `AssetStateMachine` owns transitions, interceptor owns logging |
| **O** — open/closed | New notification types, report cards, and state transitions extend registries/maps without modifying consumers; storage behind an interface |
| **L** — substitution | `StorageService` (disk today, object store later) and mock↔HTTP API transports on the client honor identical contracts |
| **I** — interface segregation | Narrow DTOs per operation (CreateAssetDto ≠ UpdateAssetDto ≠ RegisterReturnDto); client hooks expose per-feature APIs, not a god-client |
| **D** — dependency inversion | Nest DI everywhere: services consume abstractions (PrismaService, DomainEventsService) injected by the container; nothing news up its dependencies |

## 8. Frontend architecture (summary — full spec in `DESIGN-PROMPT.md`)

Feature-sliced React SPA: `components/ui` (design-system primitives) → `features/<domain>` (screens + hooks) → `api/` (typed endpoints; mock and HTTP transports are interchangeable). Server state exclusively in TanStack Query keyed per resource; socket events invalidate keys. Status→color semantics centralized in `lib/status.ts` so badges, charts, and calendar always agree. Route guards mirror the backend role matrix — UI hides what the API would reject.

## 9. Deployment & environments

- `docker-compose.yml`: `postgres` (volume-backed) + optional `api` and `client` services; one-command bootstrap: `docker compose up -d db` → `prisma migrate dev` → `prisma db seed` → `npm run start:dev` / `npm run dev`.
- Config via environment only (12-factor); identical images across environments.
- Swagger (OpenAPI) served at `/api/docs` from the same decorators that validate requests — documentation cannot drift from behavior.

## 10. Scalability roadmap

1. **Now:** stateless modular monolith, DB constraints guarantee correctness under concurrency, indexed hot paths, paginated lists, aggregate-SQL reports.
2. **Vertical headroom:** PgBouncer pooling, read-replica for `/reports/*`, monthly partitioning of `activity_logs`/`notifications` (BRIN), keyset pagination swap.
3. **Horizontal:** N API replicas behind a load balancer + Socket.IO Redis adapter; JWT keeps auth stateless.
4. **Extraction (if ever needed):** module boundaries (§3) are the seams — reports or notifications lift out to services without touching domain code.

## 11. Product differentiators

| Feature | Mechanism |
|---|---|
| Live operational dashboard | KPI invalidation events over WebSocket — no refresh, no polling |
| Conflict-aware allocation UX | 409 carries current-holder payload → UI offers "Request Transfer" inline |
| Smart booking suggestions | On overlap, gap-scan returns the next 3 free slots for the requested duration |
| Asset QR labels + scan-to-audit | Printable QR per asset; audit screen scans/enters tag to mark records verified |
| Asset Health Index | Deterministic 0–100 score (condition, age, maintenance load) driving at-risk and retirement insights |
| Command palette | Global ⌘K fuzzy search across assets, people, bookings + quick actions |
