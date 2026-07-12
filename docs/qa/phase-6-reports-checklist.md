# Dashboard KPIs & Reports Verification Checklist

This manual QA checklist documents the validation steps for the Dashboard KPI widgets and the 8 operational reports, including CSV exports and role-based data scoping in AssetFlow (base path `/api/v1`).

---

## Dashboard KPIs & Widgets

| Step ID | Endpoint | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| REP-01 | GET `/dashboard/kpis` | Log in as Admin/Manager and query the endpoint | Returns a JSON object containing exactly 7 numeric counts: `assetsAvailable`, `assetsAllocated`, `maintenanceToday`, `activeBookings`, `pendingTransfers`, `upcomingReturns`, and `overdueReturns`. | |
| REP-02 | GET `/dashboard/kpis` | Allocate an `AVAILABLE` asset to an employee and re-query | `assetsAvailable` decreases by 1 and `assetsAllocated` increases by 1. | |
| REP-03 | GET `/dashboard/overdue` | Query the endpoint as Admin or Manager | Returns a list containing only allocations where `status = "ACTIVE"` and `expectedReturnAt < now()`. | |
| REP-04 | GET `/dashboard/today-bookings` | Query the endpoint as any user | Returns a list of bookings whose scheduled time slots fall on today's calendar date. | |
| REP-05 | GET `/dashboard/upcoming-returns` | Query the endpoint as Admin/Manager | Returns allocations with `expectedReturnAt` in the future (within next 7 days). Does not include past-due overdue returns. | |
| REP-06 | GET `/dashboard/kpis` | Log in as `DEPT_HEAD` and query the endpoint | The returned KPI numbers are auto-scoped to count only their department's assets and bookings. | |

---

## Operational Reports & Filters

| Step ID | Endpoint | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| REP-07 | GET `/reports/status-distribution` | Query the status distribution report on a seeded DB | Returns asset counts grouped by lifecycle state (Available, Allocated, etc.). Data is non-empty. | |
| REP-08 | GET `/reports/utilization` | Query the asset utilization report | Returns category and asset lists sorted by total allocation count. | |
| REP-09 | GET `/reports/idle-assets` | Query the idle assets report | Returns assets that have been in `AVAILABLE` status for more than 30 days. | |
| REP-10 | GET `/reports/maintenance-frequency` | Query the maintenance frequency report | Returns counts of maintenance requests grouped by asset tag and category. | |
| REP-11 | GET `/reports/maintenance-cost-trend` | Query the maintenance cost trend report | Returns aggregate repair expenditures grouped by month. | |
| REP-12 | GET `/reports/department-allocation` | Query the department allocation summary | Returns a breakdown of active allocations and asset value/counts grouped by department. | |
| REP-13 | GET `/reports/booking-heatmap` | Query the resource booking heatmap | Returns a bucketed matrix of peak usage hours (grouped by day of week × hour blocks). | |
| REP-14 | GET `/reports/health-distribution` | Query the health distribution report | Returns inventory counts grouped by health bands (`HEALTHY`, `MONITOR`, `AT_RISK`). | |
| REP-15 | GET `/reports/*` | Add query filter `?departmentId={IT_DEPT_UUID}` to any report route | The query successfully executes and narrows all aggregated figures down to only the IT department. | |
| REP-16 | GET `/reports/*` | Add date range filters `?from=2026-06-01&to=2026-06-30` | The returned aggregate datasets respect the from/to boundaries, counting only events in June. | |

---

## Exporting & Role Boundaries

| Step ID | Endpoint | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| REP-17 | GET `/reports/*?format=csv` | Add the CSV format query parameter to any report route | The server streams back a downloadable, parseable `.csv` file with MIME type `text/csv`. | |
| REP-18 | GET `/reports/*?format=csv` | Open the downloaded CSV file and inspect the first row | The header row exactly matches the JSON keys of the corresponding REST API response. | |
| REP-19 | GET `/reports/*` | Attempt to access any report route logged in as an `EMPLOYEE` | **403 Forbidden** (System restricts all raw analytical reports to managers and heads). | |
| REP-20 | GET `/reports/*` | Log in as `DEPT_HEAD` (HR) and query a report route | The analytical data returned is auto-scoped to show only the HR department's assets and figures. | |
