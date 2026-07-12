# AssetFlow — 5-Minute Product Demo Script

This script walks through a live demonstration of AssetFlow, demonstrating the end-to-end user journeys, system invariants, and real-time mechanics.

---

## Demo Setup
1.  **Browser Window 1 (Admin/Manager)**: Open in Chrome at `http://localhost:5173`. Logged in as `admin@assetflow.io`.
2.  **Browser Window 2 (Employee)**: Open in Firefox or Chrome Incognito at `http://localhost:5173`. Logged in as `arjun.verma@assetflow.io`.
3.  **Arrange Screens**: Place both browser windows side-by-side on your monitor.

---

## Walkthrough Steps

### Step 1: Admin Controls & User Promotion (1 Minute)
*   **What to click**:
    1.  In **Browser 1 (Admin)**, click on the **Employee Directory** (Users) in the left sidebar.
    2.  Locate employee `Arjun Verma` using the search bar.
    3.  Click the **Edit/Promote** action button next to his name.
    4.  Change his role from `EMPLOYEE` to `ASSET_MANAGER` and click **Save**.
    5.  Navigate to **Organization** -> **Departments** in the sidebar. Show the department tree.
*   **What to say (Talk-Track)**:
    > "Welcome to AssetFlow. I am currently logged in as the System Admin. The platform is designed around strict, self-contained security. 
    > 
    > When a new employee registers, the system forces their role to 'EMPLOYEE'. To prevent self-elevation or security gaps, only an Admin can promote accounts from the Employee Directory, as I just did by promoting Arjun to an Asset Manager. 
    > 
    > In our organization controls, we can build hierarchical department trees, like placing 'Facilities' under 'Operations', which includes recursive loops validation to prevent hierarchy cycles."

---

### Step 2: Registering a New Asset (30 Seconds)
*   **What to click**:
    1.  In **Browser 1 (Admin)**, click on **Asset Registry** in the sidebar.
    2.  Click the **+ Register Asset** button.
    3.  Select category **Electronics**. Note the dynamic custom fields (Warranty, RAM) that appear.
    4.  Enter name: `ThinkPad X1 Carbon Gen 12`, serial number: `TPX1G12-DEMO`, acquisition cost: `165000`, condition: `NEW`, warranty: `36` months.
    5.  Click **Save**.
*   **What to say (Talk-Track)**:
    > "Now let's register a new asset. Categories in AssetFlow support custom schemas. Because this is an 'Electronics' category, the form dynamically requests the warranty period and RAM capacity. 
    > 
    > Saving this record automatically triggers a database sequence that stamps it with the next sequential tag—in this case, `AF-0033`—and marks it as 'AVAILABLE'."

---

### Step 3: Conflict-Aware Asset Allocation (45 Seconds)
*   **What to click**:
    1.  On the details card of the newly registered ThinkPad (`AF-0033`), click **Allocate**.
    2.  Select employee `Priya Patel` and click **Confirm Allocation**. Note status changes to `ALLOCATED`.
    3.  Now, click **Allocate** on the same asset again.
    4.  Type `Rajesh Kumar` as the target and click **Confirm**.
    5.  Observe the red error banner displaying: *"Allocation conflict: Currently held by Priya Patel since [Today]"* and the **Request Transfer** button.
*   **What to say (Talk-Track)**:
    > "Let's check out this new laptop to Priya. It successfully shifts the status to 'ALLOCATED'. 
    > 
    > If another manager attempts to allocate this same laptop to Rajesh, the system blocks the checkout. This double-allocation check is enforced directly at the PostgreSQL database level, meaning it is impossible to bypass. 
    > 
    > Instead of a generic database error, the API returns a structured response so the client interface can show exactly who holds the laptop and offer an inline 'Request Transfer' button."

---

### Step 4: Overlap-Proof Resource Booking & Slot Suggestions (1 Minute)
*   **What to click**:
    1.  Go to the **Bookings** page on the sidebar. Select room **Room B2 - Executive Suite**.
    2.  Select today's date on the calendar, click **Book Slot**, and schedule it for `09:00` to `10:00`. Click **Submit**. (Succeeds).
    3.  Click **Book Slot** again on Room B2, and attempt to schedule it for `09:30` to `10:30`.
    4.  Observe the error popup explaining the overlap conflict, and look at the **three recommendation chips** below the error.
    5.  Click the chip suggesting the next free slot (e.g. `10:00 - 11:00`), then click **Submit**. (Succeeds).
*   **What to say (Talk-Track)**:
    > "For shared assets like meeting rooms or company vehicles, we provide calendar bookings. 
    > 
    > Overlapping reservations are blocked at the database storage layer using a PostgreSQL Range Exclusion constraint. If I try to book Room B2 from 9:30 to 10:30 while it is already occupied, the request is rejected. 
    > 
    > However, the system runs a gap-scanning algorithm to find the next three available windows. I can simply click one of these suggestions—like 10:00 to 11:00—and complete my booking back-to-back."

---

### Step 5: Maintenance Workflow (45 Seconds)
*   **What to click**:
    1.  In **Browser 2 (Employee)**, navigate to **My Assets**.
    2.  Find an allocated asset, click **Report Issue**.
    3.  Enter title: `Keyboard key broken`, description: `Spacebar key has popped off and is missing.`, priority: `MEDIUM`. Click **Submit**.
    4.  In **Browser 1 (Admin/Manager)**, navigate to **Maintenance Requests**.
    5.  Click on the new request, click **Approve & Set Under Maintenance**. Note the asset's status in the background changes to `UNDER_MAINTENANCE`.
    6.  Click **Resolve Request**, enter notes: `Replaced keyboard assembly.`, and cost: `3500`. Click **Submit**.
*   **What to say (Talk-Track)**:
    > "When an item breaks, employees can report it directly. When the manager approves the maintenance request, the asset's state machine automatically transitions the item to 'UNDER_MAINTENANCE', making it unavailable for others to book or borrow. 
    > 
    > Once the technician completes the repair and we resolve the request, the state machine returns the asset back to its active user or mark it 'AVAILABLE' in the registry automatically."

---

### Step 6: Real-time Updates (Side-by-Side Verification) (30 Seconds)
*   **What to click**:
    1.  Observe the side-by-side browsers.
    2.  In **Browser 1 (Admin)**, go to the Asset Registry and toggle a booking or change an asset status.
    3.  Observe **Browser 2 (Employee)** instantly receive a sliding toast notification and see the dashboard numbers increment.
*   **What to say (Talk-Track)**:
    > "Notice the side-by-side screens. Whenever a checkout, transfer, or maintenance action is taken, the backend emits lightweight invalidation events via WebSockets. 
    > 
    > The employee's browser immediately invalidates its cached queries and pulls down fresh metrics, ensuring live operational dashboards without manual page reloads or wasteful HTTP polling."

---

### Step 7: Compliance Audit Cycles (45 Seconds)
*   **What to click**:
    1.  In **Browser 1 (Admin)**, go to the **Audits** page.
    2.  Click **Create Cycle**, name it: `Q3 IT Equipment Audit`, scope it to the `IT` department. Click **Start**.
    3.  A snapshot of all IT assets is generated.
    4.  Locate one asset in the list, and mark its check result as **MISSING**.
    5.  Click **Discrepancy Report** to view the missing item.
    6.  Click **Close Audit Cycle**.
    7.  Go back to the **Asset Registry**, search for that asset, and show that its status has automatically changed to `LOST`.
*   **What to say (Talk-Track)**:
    > "Compliance audits are built to handle hardware drift. Creating a cycle snapshots the inventory scope. 
    > 
    > Auditors mark assets as Verified, Missing, or Damaged. Once the cycle is closed, it is locked transactionally. Any missing assets are flipped to 'LOST' in the database, and damaged assets have their conditions automatically set to 'POOR', flagging them for repair."

---

### Step 8: Reports & Architecture Close (45 Seconds)
*   **What to click**:
    1.  Navigate to the **Reports** tab.
    2.  Briefly show the **Booking Heatmap** and the **Asset Health Distribution** chart.
    3.  Point out the **Asset Health Index** scoring.
*   **What to say (Talk-Track)**:
    > "Finally, the analytics section gives insights into asset utility. The Asset Health Index calculates a live score from 0 to 100 based on age, condition, and historical repair costs, warning managers before hardware fails. 
    > 
    > In summary, AssetFlow secures company assets by combining high-fidelity relational constraints at the PostgreSQL database level with a robust, modular NestJS API. Because it does not rely on third-party SaaS, it runs completely offline, cost-effectively, and securely. 
    > 
    > Thank you. I am ready for any questions you might have."
