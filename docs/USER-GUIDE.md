# AssetFlow — End-User Guide

Welcome to the **AssetFlow** User Guide. AssetFlow is an Enterprise Asset & Resource Management System designed to help departments catalog, allocate, schedule, and maintain company physical resources.

This guide is organized by user roles. Find your role below to learn how to navigate the platform.

---

## 1. Employee Guide
As an Employee, you represent the primary user of physical equipment (like laptops, monitors, and desks) and shared resources (like meeting rooms and vehicles).

<!-- screenshot: employee_dashboard_placeholder -->

### 1.1 Signing Up
1. Navigate to the login screen and click **Sign Up**.
2. Enter your Name, corporate Email address, and a secure password.
3. Upon registration, your account is automatically created with the **Employee** role. 
*Note: Only a System Administrator can promote your account to other roles.*

### 1.2 Viewing Your Allocated Assets
1. From the left sidebar, click on **My Assets**.
2. Here, you will see a list of all company assets currently assigned to you, along with their tags (e.g. `AF-0010`), condition status, and serial numbers.

### 1.3 Booking a Shared Resource (Rooms or Vehicles)
1. Navigate to **Bookings** in the sidebar.
2. Select a resource from the drop-down menu (e.g., a Meeting Room or Vehicle). Only items marked as `is_bookable` are visible here.
3. Review the calendar. The system permits **back-to-back bookings** (e.g., User A books 09:00–10:00 and User B books 10:00–11:00 on the same asset).
4. Select a date and click **Book Slot**. Input your purpose, start time, and end time.
5. **Conflict suggestions**: If you attempt to book an overlapping slot, the server will block the booking. The interface will display a collision warning alongside three **Suggestion Chips** showing the next closest available time windows. Click any suggestion to automatically reschedule the booking to that free slot.
<!-- screenshot: calendar_booking_suggestions -->

### 1.4 Raising a Maintenance Request
1. If an asset allocated to you is broken or needs servicing, go to **My Assets** and click **Report Issue** next to the item.
2. Enter a clear Title and Description of the issue (e.g., "ThinkPad battery dies in 10 minutes").
3. Assign a Priority: `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
4. Upload an optional Photo of the physical damage and click **Submit**.
<!-- screenshot: report_issue_form -->

### 1.5 Requesting an Asset Transfer or Initiating a Return
*   **Request a Transfer**: If you want to hand off an asset directly to a colleague, click **Request Transfer** on the asset card, select the recipient's name, write a reason, and click Submit. The request will go to your Department Head for approval.
*   **Initiate a Return**: Click **Return Asset** on the asset card. Specify the return notes, and hand the physical item back to the IT/Facilities department. An Asset Manager will inspect the condition and complete the check-in.

---

## 2. Department Head Guide
As a Department Head, you possess all capabilities of a standard Employee, plus management privileges over your department's inventory and personnel.

<!-- screenshot: department_head_dashboard -->

### 2.1 Approving Department Transfers
1. Navigate to the **Transfers** tab on the sidebar.
2. Under **Pending Approvals**, you will see transfer requests raised by or targeting employees in your department.
3. Review the request details and click **Approve** or **Reject** (rejection requires entering a reason).
*Note: Approving a transfer executes a database transaction that automatically terminates the previous checkout and opens the new employee's allocation, updating histories.*

### 2.2 Booking for the Department
1. When booking a meeting room or car under the **Bookings** scheduler, you can toggle the booking type.
2. Select **Book on Behalf of Department** and choose your department name. This marks the booking against the department's resource usage rather than your individual profile.

### 2.3 Accessing Department Reports
1. Go to **Insights & Reports** in the sidebar.
2. You will see aggregate reports (like Asset Utilization and Heatmaps) pre-filtered to show only data corresponding to your department.
3. Click the **Export CSV** button on any report to download a parsed data sheet.

---

## 3. Asset Manager Guide
As an Asset Manager, you are the custodian of the physical assets. You handle procurement entry, checkouts, returns, repairs, and audit checks.

<!-- screenshot: asset_manager_dashboard -->

### 3.1 Registering New Assets
1. Navigate to the **Asset Registry** page and click **+ Register Asset**.
2. Select the appropriate **Category**. Custom specifications fields will dynamically appear in the form.
3. Enter details including Name, Serial Number, Cost, Condition, and Location.
4. Set the **isBookable** toggle to `True` if the item is a shared room, vehicle, or AV setup.
5. Click **Save**. The system will automatically stamp the asset with the next sequential tag (e.g. `AF-0034`).

### 3.2 Checking Out (Allocating) Assets
1. Find an `AVAILABLE` asset in the registry and click **Allocate**.
2. Enter the employee's name or the department name. 
3. **Allocation Conflicts**: If you attempt to checkout an asset that is currently checked out elsewhere, the screen will display a warning showing the current holder's name and allocation date, and present a **Request Transfer** link instead.
<!-- screenshot: allocation_conflict_details -->

### 3.3 Managing Maintenance Workflows
1. Navigate to **Maintenance Requests**.
2. Select a request and click **Approve & Set Under Maintenance**. This shifts the asset to `UNDER_MAINTENANCE` status.
3. Click **Assign Technician** and input the repair technician's details.
4. Once repaired, click **Resolve Request**, type the resolution notes, input the final repair cost, and click Submit. The asset automatically flips back to its previous holder or `AVAILABLE`.

### 3.4 Participating in Audits
1. When an active audit is announced, navigate to the **Compliance Audits** tab.
2. Open the active cycle and use a QR scanner or enter the asset tags manually.
3. Mark the checked asset as `VERIFIED`, `MISSING`, or `DAMAGED` (damaged requires adding notes).

---

## 4. Admin Guide
As a System Administrator, you manage the structural configuration, user directories, role permissions, and compliance cycles.

<!-- screenshot: admin_settings_view -->

### 4.1 Organization Setup
1. Navigate to the **Admin Settings** page.
2. Use the **Departments** tab to add or edit departments. You can construct hierarchies by specifying a parent department.
3. Use the **Asset Categories** tab to manage categories. You can define custom specifications fields (JSONB data schemas) that shape asset registration forms.

### 4.2 Directory Management & Role Promotion
1. Go to the **Employee Directory** (Users).
2. To change a user's role (e.g., promote an employee to a Manager or Head), click **Edit User**.
3. Select the target role and click **Save**. 
*Note: This directory is the only place in the entire system where user roles can be altered.*

### 4.3 Password Resets
1. In the **Employee Directory**, locate the user who requires a password reset.
2. Click **Reset Password**.
3. The system will generate a temporary one-time password and display it on your screen. Give this to the employee (no external email integration is configured).

### 4.4 Creating and Closing Audit Cycles
1. Navigate to the **Compliance Audits** dashboard.
2. Click **Create Cycle**. Provide a name, date range, scope (filter by department/location), and assign specific auditors.
3. Once the audit period ends, review the **Discrepancy Report** (showing all Missing and Damaged items).
4. Click **Close Cycle**. This transactionally locks all audit records. All missing assets automatically transition to `LOST` status, and damaged assets are set to condition `POOR`.

### 4.5 Analyzing Reports & Heatmaps
1. Navigate to the **Reports** dashboard to view system-wide analytics.
2. Review reports including status distribution, booking heatmaps (showing peak usage hours), and health score distribution trends.
3. Filter by department or dates as needed, or export spreadsheets using the **CSV Export** action.
