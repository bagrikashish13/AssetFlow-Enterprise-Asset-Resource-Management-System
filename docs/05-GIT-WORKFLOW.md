# AssetFlow — Git Workflow

## 1. Branch model

Trunk-based with short-lived feature branches:

```
main                    ← always releasable; protected
 ├── feat/<scope>-<summary>     e.g. feat/bookings-overlap-constraint
 ├── fix/<scope>-<summary>      e.g. fix/allocations-return-condition
 ├── docs/<summary>             e.g. docs/database-design
 └── chore/<summary>            e.g. chore/docker-compose
```

- Branch from `main`, merge back via Pull Request. No direct commits to `main` after initial scaffold.
- Branches live hours, not days — small, reviewable slices.
- Delete branches after merge.

## 2. Commit conventions (Conventional Commits)

```
<type>(<scope>): <imperative summary ≤ 72 chars>

[optional body: what & why, not how]
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`.
Scopes mirror modules: `auth`, `users`, `departments`, `categories`, `assets`, `allocations`, `transfers`, `bookings`, `maintenance`, `audits`, `notifications`, `reports`, `dashboard`, `events`, `client`, `db`, `ci`.

Examples:
```
feat(db): add exclusion constraint preventing booking overlap
feat(allocations): return 409 with holder payload on conflict
fix(bookings): align slot suggestions to 30-minute boundaries
test(assets): cover state machine transition matrix
docs(architecture): record ADR-3 db-level conflict enforcement
```

Rules: one logical change per commit · repository builds and tests pass at every commit · migrations commit together with the code that requires them · generated artifacts and secrets never committed.

## 3. Pull requests

- Template: **What / Why / How verified** (+ screenshots for UI).
- Requirements to merge: green build (lint + typecheck + tests), review by another contributor, no unresolved threads.
- Keep PRs ≤ ~400 changed lines where practical; split otherwise.
- Squash-merge with a conventional title, so `main` history stays linear and readable.

## 4. Repository hygiene

`.gitignore` covers: `node_modules/`, `dist/`, `build/`, `.env*` (except `.env.example`), `uploads/`, coverage output, editor/OS noise (`.vscode/` selectively, `Thumbs.db`, `.DS_Store`), Prisma client output.

Committed always: `prisma/migrations/**`, `prisma/seed.ts`, `.env.example`, `docker-compose.yml`, `docs/**`.

## 5. Releases

Tag milestones on `main`: `v0.1.0` (schema + auth), `v0.2.0` (asset & allocation core), `v0.3.0` (bookings + maintenance), `v0.4.0` (audits + reports + realtime), `v1.0.0` (release candidate). Tags are annotated and follow SemVer.
