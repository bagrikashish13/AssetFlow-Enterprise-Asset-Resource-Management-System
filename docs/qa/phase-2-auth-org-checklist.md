# Phase 2 Manual-QA Checklist — Auth & Organization Modules

This checklist covers manual verification of the API endpoints for Authentication, Users, Departments, and Categories under base path `/api/v1`.

## 1. Authentication (`/auth`)

| Step | Request | Expected Result | Pass/Fail |
|---|---|---|---|
| AUTH-01 | **POST `/auth/signup`** with standard payload (`name`, `email`, `password`) | Returns `201 Created` with user details (excluding password); role is hardcoded to `EMPLOYEE` and status is `ACTIVE`. | [ ] |
| AUTH-02 | **POST `/auth/signup`** with `"role": "ADMIN"` inside the body payload | Returns `400 Bad Request` (whitelist validation error); user cannot supply role during registration. | [ ] |
| AUTH-03 | **POST `/auth/login`** with correct credentials | Returns `201 Created`; sets an `httpOnly`, `Secure`, `SameSite=Strict` cookie named `af_token`. | [ ] |
| AUTH-04 | **POST `/auth/login`** with invalid password | Returns `401 Unauthorized` with error code `INVALID_CREDENTIALS`. | [ ] |
| AUTH-05 | **GET `/auth/me`** with a valid cookie session | Returns `200 OK` containing current user identity, active role, and department relationship data. | [ ] |
| AUTH-06 | **GET `/auth/me`** with no active cookie session | Returns `401 Unauthorized` with error code `UNAUTHENTICATED`. | [ ] |
| AUTH-07 | **POST `/auth/login`** 6 times rapidly from the same IP within 1 minute | The 6th request returns `429 Too Many Requests` with error code `RATE_LIMITED`. | [ ] |
| AUTH-08 | **POST `/auth/logout`** with an active session cookie | Returns `201 Created` and clears/expires the `af_token` cookie. | [ ] |

## 2. User Directory & Role Management (`/users`)

| Step | Request | Expected Result | Pass/Fail |
|---|---|---|---|
| USER-01 | **GET `/users`** as an `ADMIN` or `ASSET_MANAGER` | Returns `200 OK` containing the list of all registered employees and metadata. | [ ] |
| USER-02 | **GET `/users`** as an `EMPLOYEE` | Returns `403 Forbidden` with error code `FORBIDDEN`. | [ ] |
| USER-03 | **GET `/users`** as a `DEPT_HEAD` | Returns `200 OK` with user list automatically scoped to only display employees of their own department. | [ ] |
| USER-04 | **PATCH `/users/:id/role`** as `ADMIN` with `{ "role": "ASSET_MANAGER" }` | Returns `200 OK`; the target user's role is successfully upgraded to `ASSET_MANAGER`. | [ ] |
| USER-05 | **PATCH `/users/:id/role`** as `ADMIN` with `{ "role": "DEPT_HEAD" }` | Returns `200 OK`; the target user's role is successfully updated to `DEPT_HEAD`. | [ ] |
| USER-06 | **PATCH `/users/:id/role`** as `ADMIN` with `{ "role": "EMPLOYEE" }` | Returns `200 OK`; the target user's role is successfully reverted/demoted. | [ ] |
| USER-07 | **PATCH `/users/:id/role`** as `ADMIN` with `{ "role": "ADMIN" }` | Returns `400 Bad Request` or `403 Forbidden`; promoting users to `ADMIN` is blocked. | [ ] |
| USER-08 | **PATCH `/users/:id/role`** as an `ASSET_MANAGER` | Returns `403 Forbidden` with error code `FORBIDDEN`. | [ ] |
| USER-09 | **PATCH `/users/:id/status`** as `ADMIN` with `{ "status": "INACTIVE" }` | Returns `200 OK`; user status updated to `INACTIVE`. | [ ] |
| USER-10 | **POST `/auth/login`** using credentials of a deactivated (`INACTIVE`) user | Returns `401 Unauthorized` or `403 Forbidden`; inactive users cannot authenticate. | [ ] |
| USER-11 | **POST `/users/:id/reset-password`** as `ADMIN` | Returns `201 Created` returning a JSON payload containing the temporary one-time password. | [ ] |
| USER-12 | **POST `/users/:id/reset-password`** as a `DEPT_HEAD` | Returns `403 Forbidden` with error code `FORBIDDEN`. | [ ] |

## 3. Department Setup & Hierarchy (`/departments`)

| Step | Request | Expected Result | Pass/Fail |
|---|---|---|---|
| DEPT-01 | **POST `/departments`** as `ADMIN` with name "Operations" | Returns `201 Created`; department successfully created with `parentId: null` and `status: ACTIVE`. | [ ] |
| DEPT-02 | **POST `/departments`** as `ADMIN` with name "Facilities" and parent department set to "Operations" | Returns `201 Created`; child department registered correctly. | [ ] |
| DEPT-03 | **POST `/departments`** as `ADMIN` with duplicate name | Returns `409 Conflict` with error code `Prisma conflict` (unique name check). | [ ] |
| DEPT-04 | **POST `/departments`** as `ASSET_MANAGER` | Returns `403 Forbidden`. | [ ] |
| DEPT-05 | **PATCH `/departments/:id`** as `ADMIN` with updated `headId` | Returns `200 OK`; the department's Department Head is updated successfully. | [ ] |
| DEPT-06 | **PATCH `/departments/:id`** as `ADMIN` with status `INACTIVE` | Returns `200 OK`; department deactivated. | [ ] |
| DEPT-07 | **PATCH `/departments/:id`** (Operations) setting its parent to "Facilities" (which is its own child) | Returns `422 Unprocessable Entity` with error code `DEPARTMENT_CYCLE` to prevent loops. | [ ] |

## 4. Categories & Custom Field Definitions (`/categories`)

| Step | Request | Expected Result | Pass/Fail |
|---|---|---|---|
| CAT-01 | **POST `/categories`** as `ADMIN` with name "Furniture" and empty custom fields | Returns `201 Created` with empty `fields` array. | [ ] |
| CAT-02 | **POST `/categories`** as `ADMIN` with name "Electronics" and custom fields schema (e.g. `warranty_months` number, `ram_gb` number) | Returns `201 Created`; categories are set up with JSON Schema-like validation configurations. | [ ] |
| CAT-03 | **POST `/categories`** as `ADMIN` with a duplicate name | Returns `409 Conflict` (unique category name check). | [ ] |
| CAT-04 | **POST `/categories`** as `ASSET_MANAGER` | Returns `403 Forbidden`. | [ ] |
| CAT-05 | **PATCH `/categories/:id`** as `ADMIN` to update field parameters | Returns `200 OK`; modifications are successfully written. | [ ] |
