# AssetFlow — Low-Level Design & API Specification

> REST base path: `/api/v1` · OpenAPI served at `/api/docs` · All timestamps ISO-8601 UTC · IDs are UUIDs.

## 1. Conventions

**Response envelopes**
```jsonc
// success (lists)
{ "data": [ ... ], "meta": { "page": 1, "limit": 20, "total": 143, "totalPages": 8 } }
// success (single) — resource object directly
// error — always this shape (GlobalExceptionFilter)
{
  "statusCode": 409,
  "errorCode": "BOOKING_OVERLAP",
  "message": "Room B2 is already booked 09:00–10:00 on 12 Jul 2026.",
  "details": [{ "field": "startAt", "message": "Overlaps an existing booking" }],
  "suggestions": [{ "startAt": "...", "endAt": "..." }],   // context payloads per errorCode
  "path": "/api/v1/bookings",
  "timestamp": "2026-07-12T09:30:00.000Z"
}
```

**Pagination & filtering:** `?page=1&limit=20&sort=createdAt:desc` (limit capped at 100). Filters are explicit query params per endpoint. Search params use `q`.

**Auth:** JWT in httpOnly cookie `af_token`. All routes require auth except `POST /auth/signup`, `POST /auth/login`. Roles enforced via `@Roles()` + `RolesGuard`; the matrix below is definitive.

**Error codes:** `VALIDATION_FAILED` 400 · `INVALID_CREDENTIALS` 401 · `UNAUTHENTICATED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `EMAIL_TAKEN` 409 · `ALLOCATION_CONFLICT` 409 · `BOOKING_OVERLAP` 409 · `INVALID_STATE_TRANSITION` 409 · `TRANSFER_ALREADY_PENDING` 409 · `CYCLE_CLOSED` 409 · `DEPARTMENT_CYCLE` 422 · `RATE_LIMITED` 429.

## 2. Endpoint catalog

### 2.1 Auth (`/auth`)
| Method & path | Roles | Body / notes |
|---|---|---|
| POST `/auth/signup` | public | `{ name, email, password }` → creates **EMPLOYEE** (role not accepted in payload); sets cookie |
| POST `/auth/login` | public | `{ email, password }`; throttled 5/min/IP; sets cookie |
| POST `/auth/logout` | any | clears cookie |
| GET `/auth/me` | any | current user incl. department — session validation |

Validation: `name` 2–80 chars · `email` RFC + lowercase-normalized · `password` ≥ 8 chars, ≥ 1 letter + 1 number.

### 2.2 Users (`/users`)
| Method & path | Roles | Notes |
|---|---|---|
| GET `/users` | ADMIN, ASSET_MANAGER, DEPT_HEAD | filters: `q, departmentId, role, status`; DEPT_HEAD auto-scoped to own department |
| PATCH `/users/:id` | ADMIN | name, departmentId |
| PATCH `/users/:id/role` | ADMIN | `{ role: ASSET_MANAGER \| DEPT_HEAD \| EMPLOYEE }` — `ADMIN` not assignable via API; **the only role-change path in the system** |
| PATCH `/users/:id/status` | ADMIN | ACTIVE/INACTIVE; inactive users cannot log in |
| POST `/users/:id/reset-password` | ADMIN | returns one-time temp password (self-hosted policy — no email service) |

### 2.3 Departments (`/departments`)
| Method & path | Roles | Notes |
|---|---|---|
| GET `/departments` | any | `?status=&q=`; includes head, parent, memberCount, assetCount |
| POST `/departments` | ADMIN | `{ name, description?, headId?, parentId? }` |
| PATCH `/departments/:id` | ADMIN | same fields + status; parent change re-validated against cycles (recursive CTE) → `DEPARTMENT_CYCLE` |

### 2.4 Categories (`/categories`)
| Method & path | Roles | Notes |
|---|---|---|
| GET `/categories` | any | includes `fields`, assetCount |
| POST `/categories` | ADMIN | `{ name, description?, icon, fields: [{key,label,type,required}] }`; `key` snake_case unique within category |
| PATCH `/categories/:id` | ADMIN | field removal allowed — existing values retained on assets, hidden in UI |

### 2.5 Assets (`/assets`)
| Method & path | Roles | Notes |
|---|---|---|
| GET `/assets` | any | filters: `q` (name/tag/serial), `categoryId, status, departmentId, location, isBookable`; each row carries `healthScore`, `healthBand`, `currentAllocation` |
| POST `/assets` | ADMIN, ASSET_MANAGER | multipart (photo optional); server assigns `assetTag`; `customFieldValues` validated against the category's field definitions (required/type) |
| GET `/assets/:id` | any | full detail |
| PATCH `/assets/:id` | ADMIN, ASSET_MANAGER | mutable fields only — status NOT writable here (state machine endpoints only) |
| GET `/assets/:id/history` | any | `{ allocations: [...], maintenance: [...] }` chronological |
| POST `/assets/:id/retire` | ADMIN, ASSET_MANAGER | guards: no active allocation / future bookings / open maintenance |
| POST `/assets/:id/dispose` | ADMIN | RETIRED → DISPOSED |
| POST `/assets/:id/mark-found` | ADMIN, ASSET_MANAGER | LOST → AVAILABLE |

### 2.6 Allocations (`/allocations`)
| Method & path | Roles | Notes |
|---|---|---|
| GET `/allocations` | role-scoped | `?status=ACTIVE&overdue=true&holderUserId=&holderDepartmentId=&assetId=`; EMPLOYEE sees own; DEPT_HEAD sees department's |
| POST `/allocations` | ADMIN, ASSET_MANAGER, DEPT_HEAD (own dept) | `{ assetId, holderUserId? \| holderDepartmentId?, expectedReturnAt?, notes? }` — asset must be AVAILABLE, else **409 `ALLOCATION_CONFLICT` + `conflict: { holderName, holderType, since }`** so the client can offer "Request Transfer" |
| POST `/allocations/:id/return` | ADMIN, ASSET_MANAGER · holder may initiate | `{ returnCondition, returnNotes? }` → allocation RETURNED, asset condition updated, asset → AVAILABLE (via state machine) |

### 2.7 Transfers (`/transfers`)
| Method & path | Roles | Notes |
|---|---|---|
| GET `/transfers` | role-scoped | `?status=` |
| POST `/transfers` | any | `{ assetId, targetUserId? \| targetDepartmentId?, reason }`; asset must have an ACTIVE allocation; one PENDING per asset (409 `TRANSFER_ALREADY_PENDING`) |
| POST `/transfers/:id/approve` | ADMIN, ASSET_MANAGER, DEPT_HEAD (target in own dept) | transactional: old allocation RETURNED → new ACTIVE allocation → request APPROVED; notifications to old/new holders |
| POST `/transfers/:id/reject` | same approvers | `{ decisionNote }` required |
| POST `/transfers/:id/cancel` | requester | PENDING only |

### 2.8 Bookings (`/bookings`)
| Method & path | Roles | Notes |
|---|---|---|
| GET `/bookings` | any | `?assetId=&from=&to=&status=&mine=true`; phase (UPCOMING/ONGOING/COMPLETED) computed server-side |
| GET `/bookings/availability` | any | `?assetId&from&to&durationMinutes` → `{ busy: [slots], suggestions: [next 3 free] }` |
| POST `/bookings` | any (DEPT_HEAD may set `forDepartmentId`) | `{ assetId, purpose, startAt, endAt, forDepartmentId? }`; rules: asset `isBookable`, `startAt` ≥ now − 5 min, `endAt > startAt`, duration ≤ 12 h. Overlap → **409 `BOOKING_OVERLAP` + `suggestions[]`** |
| PATCH `/bookings/:id` | booker, ADMIN, ASSET_MANAGER | reschedule (same overlap handling) |
| POST `/bookings/:id/cancel` | booker, ADMIN, ASSET_MANAGER | UPCOMING/ONGOING only; frees slot instantly (exclusion is status-filtered) |

**Slot suggestion algorithm** (`bookings.service`): fetch confirmed bookings for the asset in `[requestedStart, requestedStart + 7d]`, sort, walk gaps (day window 07:00–21:00 local), return first 3 gaps ≥ requested duration, aligned to 30-min boundaries.

### 2.9 Maintenance (`/maintenance`)
| Method & path | Roles | Notes |
|---|---|---|
| GET `/maintenance` | role-scoped | `?status=&assetId=&priority=` |
| POST `/maintenance` | any | multipart; `{ assetId, title, description, priority, photo? }`; non-managers restricted to assets they hold |
| POST `/maintenance/:id/approve` | ADMIN, ASSET_MANAGER | asset → UNDER_MAINTENANCE (state machine validates) |
| POST `/maintenance/:id/reject` | ADMIN, ASSET_MANAGER | `{ rejectionReason }` required |
| POST `/maintenance/:id/assign` | ADMIN, ASSET_MANAGER | `{ technicianName }` → ASSIGNED |
| POST `/maintenance/:id/start` | ADMIN, ASSET_MANAGER | → IN_PROGRESS |
| POST `/maintenance/:id/resolve` | ADMIN, ASSET_MANAGER | `{ resolutionNotes, cost? }` → RESOLVED; asset returns to ALLOCATED (if active allocation) else AVAILABLE |

### 2.10 Audits (`/audits`)
| Method & path | Roles | Notes |
|---|---|---|
| GET `/audits` | ADMIN, ASSET_MANAGER; auditors see assigned | includes `progress` rollup |
| POST `/audits` | ADMIN | `{ name, departmentId?, location?, startDate, endDate, auditorIds[] }` → snapshots in-scope assets into `audit_records` |
| GET `/audits/:id` · GET `/audits/:id/records` | assigned auditors + ADMIN/ASSET_MANAGER | records incl. expected holder |
| PATCH `/audits/:id/records/:recordId` | assigned auditor | `{ result: VERIFIED\|MISSING\|DAMAGED, notes? }`; rejected if cycle CLOSED (409 `CYCLE_CLOSED`) |
| GET `/audits/:id/discrepancies` | ADMIN, ASSET_MANAGER, auditors | auto-generated report (MISSING + DAMAGED with notes/holders) |
| POST `/audits/:id/close` | ADMIN | transactional: cycle CLOSED · confirmed MISSING assets → LOST · DAMAGED assets get condition flag · discrepancy notifications fan out; cycle immutable afterward |

### 2.11 Dashboard, notifications, activity, reports
| Method & path | Roles | Notes |
|---|---|---|
| GET `/dashboard/kpis` | any (role-scoped counts) | `DashboardKpis` shape; single aggregate query |
| GET `/dashboard/overdue` · `/dashboard/upcoming-returns` · `/dashboard/today-bookings` | any (scoped) | dashboard widgets |
| GET `/notifications` | owner | `?unread=true`; POST `/notifications/:id/read` · POST `/notifications/read-all` |
| GET `/activity-logs` | ADMIN all · DEPT_HEAD dept · others own | `?actorId=&entityType=&action=&from=&to=` |
| GET `/reports/status-distribution` · `/utilization` · `/idle-assets` · `/maintenance-frequency` · `/maintenance-cost-trend` · `/department-allocation` · `/booking-heatmap` · `/health-distribution` | ADMIN, ASSET_MANAGER, DEPT_HEAD (scoped) | all are SQL aggregates; `?from=&to=&departmentId=`; each supports `?format=csv` (streamed export) |

## 3. DTO validation (class-validator, global `ValidationPipe`)

Global config: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` — unknown fields are rejected, not ignored.

Representative rules:
```ts
export class CreateBookingDto {
  @IsUUID() assetId: string;
  @IsString() @Length(3, 200) purpose: string;
  @IsISO8601() startAt: string;
  @IsISO8601() endAt: string;            // cross-field: endAt > startAt, ≤ 12h — custom validator
  @IsOptional() @IsUUID() forDepartmentId?: string;
}
export class CreateAssetDto {
  @IsString() @Length(2, 120) name: string;
  @IsUUID() categoryId: string;
  @IsOptional() @IsString() @Length(1, 80) serialNumber?: string;
  @IsOptional() @IsDateString() acquisitionDate?: string;
  @IsOptional() @IsNumber() @Min(0) acquisitionCost?: number;
  @IsEnum(AssetCondition) condition: AssetCondition;
  @IsOptional() @IsString() @Length(1, 120) location?: string;
  @IsBoolean() isBookable: boolean;
  @IsOptional() @IsObject() customFieldValues?: Record<string, unknown>; // validated against category.fields in service
}
```
Cross-field and DB-dependent rules (slot sanity, category field conformance, XOR holder) implement custom validators or service-level checks that throw the typed 4xx errors of §1.

## 4. Domain workflows (sequences)

**Allocation with conflict** — `POST /allocations` → service loads asset `FOR UPDATE` in a transaction → status ≠ AVAILABLE ⇒ 409 with holder payload → else insert allocation + asset → ALLOCATED (state machine) + notification + `kpi:invalidate`. Race falls through to constraint C1 → mapped to the same 409.

**Booking with suggestions** — pre-check overlap via range query ⇒ friendly 409 + gap-scan suggestions; insert races surface as exclusion violation `23P01` → same 409 shape. Success emits `booking:changed` + confirmation notification; scheduler later sends reminder.

**Maintenance approval** — approve → `$transaction`: request APPROVED + asset → UNDER_MAINTENANCE → notify raiser (`maintenance:updated`). Resolve → request RESOLVED + asset returns per state machine + notify.

**Audit close** — `$transaction`: assert OPEN → set CLOSED + `closedAt` → for MISSING records: asset → LOST → for DAMAGED: asset condition → POOR → notifications (`AUDIT_DISCREPANCY`) → activity log. Any record write after close: 409 `CYCLE_CLOSED`.

**Overdue scanner (cron, every 5 min)** — ACTIVE allocations with `expectedReturnAt < now()` not yet notified today → `RETURN_OVERDUE` notifications to holder + managers + `kpi:invalidate`. Booking reminders: confirmed bookings starting in ≤ 15 min with `reminder_sent_at IS NULL` → `BOOKING_REMINDER` + stamp. Reservation flips: bookable assets AVAILABLE↔RESERVED at slot boundaries per state machine.

## 5. Health score service

Implemented once in `assets/health.ts`, used by list/detail/report queries as a SQL expression (see `03-DATABASE-DESIGN.md` §8 for the formula). Unit-tested against fixed fixtures; bands drive `healthBand` in every asset payload.

## 6. File uploads

`POST /assets` and `POST /maintenance` accept `multipart/form-data` with optional `photo`: max 5 MB, `image/jpeg|png|webp` (mimetype **and** extension checked), stored as `/uploads/{uuid}.{ext}`, served read-only at `/uploads/*`. Path never derives from user input.

## 7. Realtime contract (Socket.IO, namespace `/events`)

Handshake: cookie JWT → join `user:{id}`, `role:{ROLE}`. Events and payloads:
```
notification:new     → AppNotification
kpi:invalidate       → { keys: string[] }            // e.g. ["dashboard","allocations"]
asset:updated        → { assetId, status }
booking:changed      → { assetId, bookingId }
transfer:updated     → { transferId, status }
maintenance:updated  → { requestId, status, assetId }
```
Client rule: events only invalidate TanStack Query caches (single-flight refetch) — payloads are hints, never trusted as state.

## 8. Configuration

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | auth |
| `PORT` / `CLIENT_ORIGIN` | serving + CORS allowlist |
| `UPLOAD_DIR` / `MAX_UPLOAD_MB` | storage |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | auth rate limit |

Validated at boot with a schema (fail-fast on missing/malformed). `.env.example` committed; `.env` git-ignored.

## 9. Frontend low-level notes

Full component/screen specification lives in `DESIGN-PROMPT.md` (§5–§13) — types there are the canonical client contracts and mirror this document's API exactly. Key implementation rules: server state only via TanStack Query; mutations invalidate by key + socket events double as invalidation triggers; status colors resolved exclusively through `lib/status.ts`; API errors rendered from the §1 envelope (`details[]` → field errors, `conflict`/`suggestions` → specialized UI).
