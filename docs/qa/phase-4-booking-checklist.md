# Booking Overlap Test Matrix & Verification Checklist

This manual QA document details the test matrix and verification checklist for the Resource Booking feature in AssetFlow (base path `/api/v1`).

---

## Part 1: Overlap Test Matrix

**Scenario:** An existing booking exists on Room B2 (`AF-0021`) on 12 Jul 2026 from **09:00 to 10:00 IST** (03:30 to 04:30 UTC) with status `CONFIRMED`.

| Requested Slot | Overlaps? | Expected API Result | Pass/Fail |
|---|---|---|---|
| `09:30–10:30` | Yes | **409 Conflict** (`BOOKING_OVERLAP` with 3 suggested slots) | |
| `10:00–11:00` | No | **201 Created** (Back-to-back boundary legal, ends at 10:00 / starts at 10:00) | |
| `08:00–09:00` | No | **201 Created** (Back-to-back boundary legal, ends at 09:00 / starts at 09:00) | |
| `08:30–09:15` | Yes | **409 Conflict** (`BOOKING_OVERLAP`) | |
| `09:00–10:00` | Yes | **409 Conflict** (Exact duplicate overlap) | |
| `09:00–10:00` (on Room A1 `AF-0020`) | No | **201 Created** (Different resource, no overlap) | |
| `09:15–09:45` | Yes | **409 Conflict** (Requested slot is fully inside existing booking) | |

---

## Part 2: Booking Functional Checklist

| Step ID | Action | Expected | Pass/Fail |
|---|---|---|---|
| BKG-01 | **Book Non-Bookable Asset:** POST `/bookings` with `assetId` matching a non-bookable asset (e.g. `AF-0001` MacBook Pro) | **400 Bad Request** (`VALIDATION_FAILED` or specific status guard error) | |
| BKG-02 | **Negative Duration:** POST `/bookings` with `endAt` set chronologically before `startAt` (e.g., start 10:00, end 09:30) | **400 Bad Request** (`VALIDATION_FAILED` or custom validator exception) | |
| BKG-03 | **Zero Duration:** POST `/bookings` with `startAt` equal to `endAt` (e.g. 10:00 to 10:00) | **400 Bad Request** (`VALIDATION_FAILED`) | |
| BKG-04 | **Exceed Max Duration:** POST `/bookings` with a total duration of 13 hours (limit is 12 hours) | **400 Bad Request** (Duration exceeds the maximum allowed 12-hour limit) | |
| BKG-05 | **Cancel Upcoming Booking:** POST `/bookings/:id/cancel` for a booking starting tomorrow | **200 OK** (Status changed to `CANCELLED` and slot is freed immediately) | |
| BKG-06 | **Rebook Cancelled Slot:** POST `/bookings` requesting the exact slot of the booking cancelled in BKG-05 | **201 Created** (Successfully booked, old exclusion removed by status filter) | |
| BKG-07 | **Reschedule Into Occupied Slot:** PATCH `/bookings/:id` changing `startAt` and `endAt` into an occupied slot | **409 Conflict** (`BOOKING_OVERLAP`) | |
| BKG-08 | **Smart Suggestions Alignment:** Trigger a conflict and inspect the `suggestions` array | Array contains exactly 3 suggestions, all **30-minute aligned** and matching the requested duration | |
| BKG-09 | **Smart Suggestions Window:** Trigger conflict and inspect suggestion slot times | All suggestions fall within defined office hours (**07:00 to 21:00 Local Time**) | |
| BKG-10 | **Book in Past:** POST `/bookings` with `startAt` set to 1 hour in the past | **400 Bad Request** (Cannot book past slots, `startAt` must be $\ge$ `now - 5 min`) | |
| BKG-11 | **Check Availability Endpoint:** GET `/bookings/availability` with query `?assetId=AF-0021&from=...&to=...&durationMinutes=60` | Returns `{ busy: [...], suggestions: [...] }` | |
| BKG-12 | **Cancel Ongoing Booking:** POST `/bookings/:id/cancel` during the ongoing booking time window | **200 OK** (Successfully cancelled, remaining slot duration is freed) | |
| BKG-13 | **Cancel Completed Booking:** POST `/bookings/:id/cancel` for a booking that occurred yesterday | **400 Bad Request** or **409 Conflict** (Cannot cancel a completed booking) | |
| BKG-14 | **Department Scoping (DH):** Log in as `DEPT_HEAD` and POST `/bookings` with `forDepartmentId` set | **201 Created** (Booking is successfully created on behalf of their department) | |
