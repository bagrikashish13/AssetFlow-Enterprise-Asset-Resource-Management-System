# Audit Cycles, Notifications & Real-Time Sync QA Checklist

This checklist documents the manual QA validation steps for the Audit Cycles, Notification Engine, WebSocket Gateway, and Schedulers in AssetFlow (base path `/api/v1`).

---

## Audit & Verification Workflows

| Step ID | Feature Area | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| AUD-01 | **Audit Creation** | POST `/audits` as Admin scoped to IT department (`departmentId` of IT) and select dates/auditors | **201 Created**. Audit cycle opened. `audit_records` are auto-materialized for all assets in the IT department with empty verification results (`result = null`). | |
| AUD-02 | **Access Enforcement** | PATCH `/audits/:id/records/:recordId` with verdict, logged in as a user who is **not** assigned as auditor for this cycle | **403 Forbidden** (Auditor-only route guard blocks access). | |
| AUD-03 | **Verify Asset (Present)** | PATCH `/audits/:id/records/:recordId` as assigned Auditor with `{ "result": "VERIFIED" }` | **200 OK**. Status updated, auditor ID logged, timestamps recorded. | |
| AUD-04 | **Flag Asset Missing** | PATCH `/audits/:id/records/:recordId` as Auditor with `{ "result": "MISSING", "notes": "Not in server rack" }` | **200 OK**. Status set to missing, comments logged. | |
| AUD-05 | **Flag Asset Damaged** | PATCH `/audits/:id/records/:recordId` as Auditor with `{ "result": "DAMAGED", "notes": "Broken casing screen" }` | **200 OK**. Status set to damaged. | |
| AUD-06 | **Discrepancy Report** | GET `/audits/:id/discrepancies` as Auditor or Admin | **200 OK**. Returns a filtered list of only the assets marked as `MISSING` or `DAMAGED` with notes and expected holders. | |
| AUD-07 | **Audit Close-out** | POST `/audits/:id/close` as Admin | **200 OK**. Cycle status becomes `CLOSED`. In main registry, missing assets become `LOST`, and damaged assets have condition updated to `POOR` (re-calculating health index). | |
| AUD-08 | **Immutability Check** | PATCH `/audits/:id/records/:recordId` after cycle is closed | **409 Conflict** (`CYCLE_CLOSED` error, no modifications allowed after close-out). | |
| AUD-09 | **Close Closed Cycle** | POST `/audits/:id/close` on an already closed cycle | **409 Conflict** (`CYCLE_CLOSED`). | |

---

## Notification Engine

| Step ID | Notification Type | Trigger Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| NTF-01 | **Asset Allocation** | Allocate an asset to an employee | Holder receives `ASSET_ASSIGNED` in-app notification with template values. | |
| NTF-02 | **Maintenance Approval** | Approve a maintenance request as Asset Manager | Request raiser receives `MAINTENANCE_APPROVED` notification. | |
| NTF-03 | **Booking Confirmation** | Book a conference room | Booker receives `BOOKING_CONFIRMED` notification. | |
| NTF-04 | **Transfer Approval** | Approve an asset transfer request | Requester receives `TRANSFER_APPROVED` notification. | |
| NTF-05 | **Return Overdue Alert** | Wait/trigger scheduler for overdue check-out | Holder receives `RETURN_OVERDUE` alert warning. | |
| NTF-06 | **Audit Discrepancy** | Close an audit cycle that contains missing/damaged assets | Department managers and holders receive `AUDIT_DISCREPANCY` warnings. | |
| NTF-07 | **Read Mark All** | POST `/notifications/read-all` as user | **200 OK**. All notifications marked as read. Unread notification counter becomes `0`. | |
| NTF-08 | **Read Specific** | POST `/notifications/:id/read` as owner | **200 OK**. Target notification is flagged as read. | |

---

## WebSockets & Real-Time Sync

| Step ID | WebSocket Event | Verification Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| RTC-01 | **Real-Time Notification** | 1. Open Browser A (Admin) and Browser B (Employee).<br>2. Admin allocates a laptop to the employee in Browser A. | Browser B instantly displays a floating notification toast (*"Asset assigned to you"*) and increments the bell counter with no page refresh. | |
| RTC-02 | **Dashboard Live Sync** | 1. Open Browser A (Admin) showing Dashboard KPIs.<br>2. Open Browser B (Employee) and create a booking. | Browser A's "Active Bookings" and "Maintenance Today" counters invalidate and update instantly via WebSocket (`kpi:invalidate`). | |

---

## Schedulers

| Step ID | Scheduler Job | Action / Time Boundary | Expected Result | Pass/Fail |
|---|---|---|---|---|
| SCH-01 | **Booking Reminder** | A confirmed booking is $\le 15$ minutes from starting | Cron checks and sends a `BOOKING_REMINDER` notification to the booker. Sets `reminder_sent_at` timestamp. | |
| SCH-02 | **Reminder Idempotency** | Trigger the booking reminder scheduler cron again 1 minute later | No duplicate notification is sent (idempotency is protected by `reminder_sent_at` check). | |
