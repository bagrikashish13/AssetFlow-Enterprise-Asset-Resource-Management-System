# AssetFlow — Testing Strategy

## 1. Approach

Risk-weighted pyramid: the domain's value is in its **invariants** (no double allocation, no booking overlap, legal state transitions, no privilege escalation), so tests concentrate there. UI is exercised through integration flows and manual demo scripts rather than pixel tests.

```
        E2E (API, supertest)      — happy paths + the critical conflict paths
      Integration (real Postgres) — constraints, transactions, race outcomes
  Unit (Jest)                     — state machines, algorithms, guards, validators
```

## 2. Unit tests (fast, no I/O)

| Target | Cases |
|---|---|
| `AssetStateMachine` | full transition matrix — every allowed edge succeeds, every forbidden edge throws `INVALID_STATE_TRANSITION`; resolve-returns-to-holder rule |
| Slot suggestion algorithm | gaps found across day windows, 30-min alignment, duration filtering, no suggestions when week is full, back-to-back boundaries |
| Health score | each penalty term, clamping, band edges (79/80, 49/50) |
| Booking phase derivation | UPCOMING/ONGOING/COMPLETED boundaries, cancelled precedence |
| `RolesGuard` + ownership scoping | role matrix per §2 of `04-LLD.md`; DEPT_HEAD scoping |
| DTO validators | representative accept/reject per DTO incl. cross-field (endAt > startAt, XOR holder, custom-field conformance) |
| Overdue detection | expectedReturnAt boundaries, timezone safety |

## 3. Integration tests (real PostgreSQL via Docker)

Run against a disposable schema (`prisma migrate deploy` into a test database, truncate between suites).

| Invariant | Test |
|---|---|
| C1 one active allocation | two concurrent allocation attempts for one asset → exactly one succeeds, other maps to `ALLOCATION_CONFLICT` |
| C2 booking exclusion | overlapping insert rejected by constraint (bypassing service pre-check) → mapped 409; back-to-back pair commits |
| Transfer transaction | approve → old allocation RETURNED + new ACTIVE + request APPROVED atomically; failure mid-way rolls back all |
| Audit close | MISSING → asset LOST, cycle immutable afterward (record write → `CYCLE_CLOSED`) |
| Cascade/restrict policy | deleting referenced master data is rejected; deactivation path works |

## 4. E2E (supertest against the Nest app)

Scripted journeys mirroring the demo: signup (forced EMPLOYEE) → admin promotes → asset registration (tag auto-assigned) → allocation → duplicate allocation blocked with holder payload → transfer request/approval → booking + overlap rejection + suggestion acceptance → maintenance full workflow with asset status side effects → audit cycle open→check→close → notifications and activity log emitted throughout. Security assertions inline: role-restricted routes return 403 for lower roles; signup payload with `role: "ADMIN"` is rejected by whitelist validation.

## 5. Frontend

- Typecheck (`tsc --noEmit`) and ESLint as build gates.
- Component smoke tests for the design-system primitives (render + interaction via Testing Library) where they carry logic (Combobox keyboard nav, DataTable sort, Modal focus trap).
- Screen-level correctness is covered by the API E2E suite plus a scripted manual demo checklist (`docs/DESIGN-PROMPT.md` §7 quality bar doubles as the review checklist).

## 6. CI pipeline (GitHub Actions)

`push` / `pull_request` →
1. Install (cached) → lint → typecheck (server + client)
2. Unit tests
3. Spin up Postgres service container → migrate → integration + E2E suites
4. Build server + client (build must stay green)

Merge to `main` requires all stages green. Coverage gate: ≥ 80% lines on `modules/**/services` and `common/guards`; reports uploaded as CI artifacts.

## 7. Commands

```bash
npm run test            # unit
npm run test:int        # integration (needs docker compose db)
npm run test:e2e        # supertest journeys
npm run test:cov        # coverage
npm test -- asset-state # single spec by pattern
```
