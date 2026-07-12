# Phase 3 Manual-QA Checklist — Assets, Allocations, and Transfers

This checklist covers manual verification of the API endpoints for Asset Registry, Allocations, and Transfers under base path `/api/v1`.

## 1. Asset Registry & Operations (`/assets`)

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| ASSET-01 | **POST `/assets`** as `ADMIN` with valid fields | Returns `201 Created`; asset is registered with an auto-assigned sequential `assetTag` (e.g. `AF-0033`) and status defaults to `AVAILABLE`. | [ ] |
| ASSET-02 | **POST `/assets`** with `"acquisitionCost": -50` | Returns `400 Bad Request` (validation error: cost must not be less than 0). | [ ] |
| ASSET-03 | **POST `/assets`** with image upload > 5MB | Returns `400 Bad Request` (validation error: file exceeds 5MB size limit). | [ ] |
| ASSET-04 | **POST `/assets`** with invalid image extension (e.g. `.zip`, `.exe`) | Returns `400 Bad Request` (validation error: image files only allowed). | [ ] |
| ASSET-05 | **GET `/assets?status=AVAILABLE`** | Returns `200 OK` listing only assets that are currently available. | [ ] |
| ASSET-06 | **GET `/assets?categoryId=<id>`** | Returns `200 OK` listing only assets belonging to the specified category. | [ ] |
| ASSET-07 | **GET `/assets?location=Warehouse`** | Returns `200 OK` listing only assets located in "Warehouse". | [ ] |
| ASSET-08 | **GET `/assets/:id/history`** for a new asset | Returns `200 OK` showing empty lists for allocation and maintenance history. | [ ] |
| ASSET-09 | **POST `/assets/:id/retire`** on an asset with status `ALLOCATED` | Returns `409 Conflict` (cannot retire an asset with an active allocation). | [ ] |
| ASSET-10 | **POST `/assets/:id/retire`** on an asset with status `AVAILABLE` | Returns `201 Created` / `200 OK`; asset status transitions to `RETIRED`. | [ ] |
| ASSET-11 | **POST `/assets/:id/dispose`** on an asset with status `RETIRED` | Returns `201 Created` / `200 OK` as `ADMIN`; asset status transitions to `DISPOSED` (terminal state). | [ ] |
| ASSET-12 | **POST `/assets/:id/mark-found`** on an asset with status `LOST` | Returns `201 Created` / `200 OK`; asset status transitions back to `AVAILABLE`. | [ ] |

## 2. Asset Allocations (`/allocations`)

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| ALLOC-01 | **POST `/allocations`** with `assetId` (AVAILABLE) and `holderUserId` (employee) | Returns `201 Created`; allocation status is `ACTIVE`, and the asset status is updated to `ALLOCATED`. | [ ] |
| ALLOC-02 | **POST `/allocations`** with same `assetId` (currently ALLOCATED) | Returns `409 Conflict` with error code `ALLOCATION_CONFLICT`, containing current holder information in the response payload. | [ ] |
| ALLOC-03 | **POST `/allocations`** with both `holderUserId` and `holderDepartmentId` populated | Returns `400 Bad Request` (validation error: exactly one holder must be specified). | [ ] |
| ALLOC-04 | **POST `/allocations/:id/return`** with condition check-in notes | Returns `201 Created` / `200 OK`; allocation status updates to `RETURNED`, asset status transitions to `AVAILABLE`, and check-in condition notes are stored. | [ ] |
| ALLOC-05 | **POST `/allocations/:id/return`** as an unauthorized employee | Returns `403 Forbidden`. | [ ] |

## 3. Asset Transfers (`/transfers`)

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| TRANS-01 | **POST `/transfers`** with `assetId` (currently ALLOCATED) and `targetUserId` | Returns `201 Created`; transfer request is created with status `PENDING`. | [ ] |
| TRANS-02 | **POST `/transfers`** for the same asset (already having a pending request) | Returns `409 Conflict` with error code `TRANSFER_ALREADY_PENDING` (only one pending transfer request allowed at a time). | [ ] |
| TRANS-03 | **POST `/transfers`** for an asset that is currently `AVAILABLE` | Returns `409 Conflict` (transfers can only be requested for allocated assets). | [ ] |
| TRANS-04 | **POST `/transfers/:id/approve`** as `ADMIN` or target `DEPT_HEAD` | Returns `200 OK` and executes transactionally: old allocation is closed, new active allocation is opened, request is marked `APPROVED`, and asset is allocated to the new holder. | [ ] |
| TRANS-05 | **POST `/transfers/:id/reject`** with `{ "decisionNote": "Required locally" }` | Returns `200 OK` and marks request `REJECTED`. | [ ] |
| TRANS-06 | **POST `/transfers/:id/cancel`** as the transfer requester | Returns `200 OK` and marks request `CANCELLED`. | [ ] |
| TRANS-07 | **GET `/assets/:id/history`** after allocation, transfer, and return cycles | Returns `200 OK`; history timeline accurately lists the full chronological sequence of operations in order. | [ ] |
