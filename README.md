# 💸 FairShare - Bill Splitting & Transaction Settlement Platform

FairShare is a premium, full-stack bill splitting and financial settlement web application. It calculates group-level net balances, runs transaction-reduction algorithms (Greedy and DFS) to simplify debt networks, and offers secure online payment gateways (via Razorpay) alongside manual cash logging.

---

<a id="index"></a>
## 📖 Table of Contents

| Topic / Component | Sub-Sections | Description |
| :--- | :--- | :--- |
| **[1. Technical Architecture](#technical-architecture)** | • System Architecture Diagram | High-level system overview, layers, and dependencies. |
| **[2. Prerequisites & Setup](#setup)** | • [Backend Setup](#backend-setup)<br>• [Frontend Setup](#frontend-setup) | System variables, local startup, and `.env` setups. |
| **[3. Core Business Logic](#business-logic)** | • [Net Balance Formula](#balance-formula)<br>• [Splitting Strategies](#splitting-strategies)<br>• [Direct vs. Indirect](#direct-vs-indirect) | Splitting models (`EQUAL`, `EXACT`, `PERCENTAGE`) and ledger calculations. |
| **[4. Simplification Algorithms](#simplification-algorithms)** | • [Greedy Simplification](#greedy-simplification)<br>• [DFS Cycle Elimination](#dfs-simplification) | Heuristics and backtracking optimization models to reduce cash flow. |
| **[5. Database Schemas & Ledger Integrity](#database-schemas)** | • [Collections & Entities](#db-entities)<br>• [Lifecycle Rules](#ledger-rules) | Schema structure for users, groups, expenses, payments, and cascading integrity logic. |
| **[6. FIFO Ledger Matching](#fifo-ledger)** | • [Algorithm Mechanism](#fifo-mechanism)<br>• [Split State Diagram](#split-state-diagram) | Chronological matching for user payments against split liabilities. |
| **[7. Settlement States & Flow](#settlement-logic)** | • [Manual Cash Rules](#manual-cash-rules)<br>• [Razorpay Checkout](#razorpay-flow) | Core transaction approval, verification states, and Razorpay signature math. |
| **[8. End-to-End Workflows](#workflows)** | • [Registration](#workflow-a)<br>• [Groups Management](#workflow-b)<br>• [Expense Log](#workflow-c)<br>• [Razorpay Settle](#workflow-d)<br>• [Claim Approval](#workflow-e) | Full code traces from client events through controllers/services to database. |
| **[9. API Route Registry](#api-routes)** | • Endpoints Reference Table | Structured reference table for all REST controllers. |

---

<a id="technical-architecture"></a>
## 🏗️ Technical Architecture & Stack

```
   ┌──────────────────────────────────────────────────────────┐
   │                     REACT FRONTEND                       │
   │      (Vite, React Router, Tailwind CSS, Lucide Icons)     │
   └─────────────────────────────┬────────────────────────────┘
                                 │
                     HTTP REST   │   Razorpay Checkout SDK
                     Requests    │   (Payment Gateways)
                                 ▼
   ┌──────────────────────────────────────────────────────────┐
   │                    SPRING BOOT BACKEND                   │
   │  (Security/JWT, MVC Controllers, Services, Algorithms)   │
   └─────────────────────────────┬────────────────────────────┘
                                 │
                     Spring Data │
                     MongoDB     ▼
   ┌──────────────────────────────────────────────────────────┐
   │                     MONGODB DATABASE                     │
   │     Collections: users, groups, expenses, payments       │
   └──────────────────────────────────────────────────────────┘
```

* **React Frontend:** Utilizes React 19 and Vite 8 for speed, Tailwind CSS v4 for utility-first styling, and Lucide React for visual icons. All API client requests are structured inside `api.js`.
* **Spring Boot Backend:** Uses Spring Security for token filtering. Business logic is separated into Controllers, Services, and Repositories.
* **Database:** MongoDB Atlas is accessed via Spring Data MongoDB repositories.

---

<a id="setup"></a>
## ⚙️ Production & Development Setup

<a id="backend-setup"></a>
### Backend Environment Setup
1. Create a `.env` file inside the `backend/` directory:
   ```properties
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/FairShare
   JWT_SECRET=FAIRSHARE_SECRET_TOKEN_FOR_DEV_ONLY_SHOULD_BE_256_LONG
   RAZORPAY_KEY_ID=rzp_test_YourKeyId
   RAZORPAY_KEY_SECRET=YourKeySecret
   FRONTEND_URL=http://localhost:5173
   ```
2. In `application.properties`, these variables map directly:
   * `frontend.url=${FRONTEND_URL}` controls CORS access.
   * `spring.mongodb.uri=${MONGO_URI}` coordinates DB persistence.
3. Start the server:
   ```bash
   cd backend
   mvn spring-boot:run
   ```

<a id="frontend-setup"></a>
### Frontend Environment Setup
1. Create a `.env` file in the `frontend/` directory:
   ```properties
   VITE_API_BASE_URL=http://localhost:8080
   VITE_FRONTEND_URL=http://localhost:5173
   ```
2. Start the client:
   ```bash
   cd frontend
   npm run dev
   ```

---

<a id="business-logic"></a>
## 📊 Core Business Logic & Calculations

<a id="balance-formula"></a>
### Raw Net Balance Formula
A user's balance within a group represents how much they are owed (positive) or how much they owe (negative). This is calculated using the ledger equation:
$$\text{Net User Balance} = \sum (\text{Bills Paid}) - \sum (\text{Owed Split Shares}) + \sum (\text{Completed Payments Received}) - \sum (\text{Completed Payments Paid})$$

Where:
* **Bills Paid:** Sum of total amounts of expenses paid by the user.
* **Owed Split Shares:** Sum of split amounts calculated for the user across all expenses.
* **Completed Payments Received:** Sum of verified, completed settlements paid *to* this user.
* **Completed Payments Paid:** Sum of verified, completed settlements paid *by* this user.

<a id="splitting-strategies"></a>
### Splitting Strategies (Equal, Exact, Percentage)
When logging an expense, `ExpenseService.java` routes the calculation through `SplitStrategyFactory.java`:
1. **Equal Split (`EqualSplitStrategy`):** Splits `totalAmount` equally among target members:
   $$\text{owedAmount} = \frac{\text{totalAmount}}{\text{number of members}}$$
2. **Exact Split (`ExactSplitStrategy`):** Maps custom amounts directly. The service asserts that:
   $$\sum (\text{split owedAmount}) = \text{totalAmount}$$
3. **Percentage Split (`PercentageSplitStrategy`):** Calculates shares based on percentages:
   $$\text{owedAmount} = \text{totalAmount} \times \frac{\text{percentage}}{100}$$
   Asserts that the sum of percentages equals exactly 100%.

<a id="direct-vs-indirect"></a>
### Direct vs. Indirect Settlements
When group balances are simplified, middleman debts are bypassed. For example, if User A owes User B ₹100, and User B owes User C ₹100, simplification resolves this to **User A pays User C ₹100**.
* **Direct Payments:** Directly reduce the balance of the payer and recipient.
* **Indirect Impact:** To keep the middleman's (User B) balance correct, `BalanceSheetService.java` calculates individual balances by starting from the global simplified debts list. This guarantees that indirect payments fully clear the middleman's liabilities.

---

<a id="simplification-algorithms"></a>
## 🧮 Debt Simplification Algorithms

FairShare includes two algorithms in `GreedyDebtSimplifier.java` and `DfsDebtSimplifier.java` (invoked via the `/simplify` endpoint).

<a id="greedy-simplification"></a>
### Greedy Debt Simplification (Approximate Heap Matching)
1. **Calculate Net Balances:** Compute the net raw balance of every user.
2. **Classify Debtors and Creditors:** Group users into a list of debtors (balance < 0) and creditors (balance > 0).
3. **Sort priority lists:** Sort both lists in descending order of absolute balances.
4. **Iterative Matching:**
   * Pop the largest debtor (A) and largest creditor (B).
   * Match them for a transaction:
     $$\text{settleAmount} = \min(|balance_A|, balance_B)$$
   * Record the simplified transaction: `A pays B settleAmount`.
   * Update their balances. Re-insert them into the sorted lists if they still have outstanding balances.
5. **Runtime Complexity:** $\mathcal{O}(N \log N)$ where $N$ is the number of group members.

<a id="dfs-simplification"></a>
### DFS Cycle Elimination (Optimal Path Search)
Used to find the optimal cash flow paths by resolving cycles and minimizing total transaction volume:
1. **Construct Directed Graph:** Build a directed graph representing debts where edges point from debtors to creditors.
2. **Identify Cycles:** Use Depth First Search (DFS) to detect back-edges, which indicate circular debt loops (e.g., A owes B, B owes C, C owes A).
3. **Cycle Reduction:**
   * Trace the path of the cycle.
   * Determine the minimum transaction amount along the cycle:
     $$M = \min(weight(e) \text{ for edge } e \text{ in cycle})$$
   * Subtract $M$ from every edge in the cycle.
   * Remove any edges whose weights drop to 0, breaking the circular dependency.
4. **Backtracking Optimization:** The DFS engine recursively searches combinations to find the graph layout that minimizes both transaction count and transaction weights.

---

<a id="database-schemas"></a>
## 📂 Database Schemas & Ledger Integrity

FairShare structures its financial ledger using four primary MongoDB collections.

<a id="db-entities"></a>
### 1. Database Collections & Entities
* **`users` (`User.java`):** Stores user identity data.
  * Attributes: `id` (ObjectId), `name` (String), `email` (String), `phoneNumber` (String), `password` (String, BCrypt hashed).
* **`groups` (`Group.java`):** Groups containing multiple members.
  * Attributes: `id` (ObjectId), `name` (String), `type` (Enum: `HOME`, `TRIP`, `COUPLES`, `OTHER`), `memberIds` (List of ObjectIds).
* **`expenses` (`Expense.java`):** Represents a purchase/payment event made by a member that is split among group members.
  * Attributes: `id` (ObjectId), `groupId` (ObjectId), `description` (String), `totalAmount` (Double), `paidById` (ObjectId), `splitType` (Enum: `EQUAL`, `EXACT`, `PERCENTAGE`), `splitDetails` (List of `SplitDetail` DTOs: `userId`, `owedAmount`, `percentage`).
* **`payments` (`Payment.java`):** Represents settlements between debtors and creditors.
  * Attributes: `id` (ObjectId), `groupId` (ObjectId), `payerId` (ObjectId), `receiverId` (ObjectId), `amount` (Double), `paymentMethod` (Enum: `CASH`, `RAZORPAY`), `status` (Enum: `PENDING`, `AWAITING_APPROVAL`, `COMPLETED`, `REJECTED`), `razorpayOrderId` (String), `razorpayPaymentId` (String), `razorpaySignature` (String), `createdAt` (Date).

<a id="ledger-rules"></a>
### 2. Ledger Integrity & Lifecycle Rules
To maintain the mathematical consistency of the balance sheets, the ledger implements strict consistency rules:
* **Cascade Deletes:** Deleting an expense automatically triggers a database hook deleting all associated payment transactions. Deleting a group cascades to remove all associated expenses and payments.
* **Credit Card Balance Sheet Mechanism:** Instead of updating static balances, net balances are computed dynamically on-demand from the complete event log of expenses and completed payments. This prevents state drifting.
* **Double-Entry Booking Verification:** For every transaction, the debtor's balance is debited and the creditor's balance is credited by the exact same amount, guaranteeing that the sum of all balances in the group is always exactly 0:
  $$\sum_{i=1}^{N} \text{Balance}_i = 0$$

---

<a id="fifo-ledger"></a>
## 📑 Chronological FIFO Ledger Matching Logic

Because settlements (payments) are logged globally for a group rather than against specific expenses, the frontend needs to map payments to individual expense splits to show which splits are paid. `ExpenseCard.jsx` implements a **First-In, First-Out (FIFO) chronological ledger matcher**:

<a id="fifo-mechanism"></a>
### Algorithm Mechanism
1. **Collect and Sort:** Gather all group expenses and payments, and sort them chronologically by their creation dates.
2. **Initialize Ledgers:** Keep a running registry of "unpaid split debts" (Debtor $\rightarrow$ Creditor $\rightarrow$ Amount) and "unapplied payments" (Payer $\rightarrow$ Recipient $\rightarrow$ Amount).
3. **Queue Expenses:** For each expense, queue the individual unpaid splits as debts.
4. **Apply Completed/Pending Payments:** Loop through payments chronologically:
   * **Completed Payments:** Deduct the payment amount from the oldest matching queued split debt (matching Payer and Recipient). If the debt is fully cleared, mark the split status as **`SETTLED`**.
   * **Pending Payments (`AWAITING_APPROVAL`):** Match them against the oldest active split debt. If matched, mark the split status as **`AWAITING_APPROVAL`**.
5. **Render Split Status:**
   * Fully paid splits show a **`Settled`** badge.
   * Splits matched to pending payments show an **`Awaiting approval`** badge.
   * Unresolved splits display the outstanding **`Owes ₹X`** amount.

<a id="split-state-diagram"></a>
### State Diagram of Splits
```
         +───────────────+
         │   UNSETTLED   │ (Created by Expense Split)
         +───────┬───────+
                 │
                 │ Payer initiates payment (Cash/Online)
                 ▼
     +───────────────────────+
     │   AWAITING_APPROVAL   │ (Pending recipient confirmation)
     +───────┬───────────┬───+
             │           │
   Recipient │           │ Recipient
    approves │           │ rejects
             ▼           ▼
        +─────────+   +───────────────+
        │ SETTLED │   │   UNSETTLED   │
        +─────────+   +───────────────+
```

---

<a id="settlement-logic"></a>
## 🔐 Settlement States & Payment Flow Logic

Settlements in FairShare transition through distinct states: `PENDING`, `AWAITING_APPROVAL`, `COMPLETED`, and `REJECTED`.

<a id="manual-cash-rules"></a>
### Manual Cash Recording Rules
To prevent fraud, manual cash entries are subject to validation rules:
* **Creditor Records Cash:** If the creditor (the receiver) logs a cash payment, the status is set to **`COMPLETED`** immediately. The system trusts that the receiver has the cash in hand.
* **Debtor Records Cash:** If the debtor (the payer) logs a cash payment, the status is set to **`AWAITING_APPROVAL`**. The recipient must log in and confirm receipt before the debt is cleared.

<a id="razorpay-flow"></a>
### Razorpay Online Checkout Flow
1. **Order Creation:** The client requests an order. The backend requests a secure Order ID from Razorpay's API.
2. **Checkout Overlay:** The client opens Razorpay's checkout widget using the Order ID.
3. **Verification:** Once payment is made, the frontend submits the payment tokens to the backend. The backend computes the HMAC signature:
   $$\text{HMAC}(\text{order\_id} + "|" + \text{payment\_id}, \text{key\_secret}) \equiv \text{signature}$$
   If verified, the payment is saved with **`AWAITING_APPROVAL`** status.
4. **Approval:** The creditor approves the payment, marking the transaction as **`COMPLETED`**.

---

<a id="workflows"></a>
## 🔄 End-to-End User Workflows

<a id="workflow-a"></a>
### Workflow A: User Registration & Authentication
1. **Trigger:** The user opens `Register.jsx`, inputs their details, and clicks **Sign Up**.
2. **Frontend Dispatch:** `AuthContext.jsx` runs `signup(...)`, which calls `api.auth.signup(payload)` inside `api.js`.
3. **Backend Route:** `POST /api/auth/signup` reaches `AuthController.java`.
4. **Service & DB Write:** `authService` checks duplicate constraints via `userRepository`. If unique, it hashes the password and saves the `User` document.
5. **Token Generation:** The backend generates a JWT token and returns an `AuthResponse` DTO.
6. **Frontend State Update:** `AuthContext.jsx` stores the user's details and token, updating `isAuthenticated` to true. React Router redirects the user to the `Dashboard.jsx` page.

<a id="workflow-b"></a>
### Workflow B: Group & Member Administration
1. **Trigger:** The user opens the "Create Group" modal in `Dashboard.jsx`, enters a name, type, and invites members, then clicks **Create**.
2. **Frontend Dispatch:** `Dashboard.jsx` calls `api.groups.createGroup(...)` in `api.js`.
3. **Backend Route:** `POST /api/groups` reaches `GroupController.java`.
4. **Service & DB Write:** `GroupService.java` saves the group with the list of member IDs.
5. **Frontend State Update:** The dashboard appends the new group to the `groups` state array and re-renders the list of group cards.

<a id="workflow-c"></a>
### Workflow C: Expense Logging & Automatic Splitting
1. **Trigger:** A user clicks **Add Expense** in `GroupDetails.jsx`, enters details (description, total amount, payer, split strategy), and clicks **Save**.
2. **Frontend Dispatch:** The modal calls `api.expenses.createExpense(...)` in `api.js`.
3. **Backend Route:** `POST /api/expenses` reaches `ExpenseController.java`.
4. **Business Logic Execution:** `ExpenseService.java` resolves the split strategy (`EQUAL`, `EXACT`, or `PERCENTAGE`), calculates each member's share, and saves the `Expense` document.
5. **Frontend State Update:** `GroupDetails.jsx` catches the callback, refetches balances, and re-runs the FIFO ledger matching logic to update the UI cards.

<a id="workflow-d"></a>
### Workflow D: Razorpay Settlement & Signature Verification
1. **Trigger:** A debtor clicks **Settle Up** in `SettlePaymentModal.jsx`, selects **Razorpay**, and clicks **Pay Now**.
2. **Backend Order Route:** `POST /api/payments/order` fetches a Razorpay Order ID.
3. **Payment Widget Overlay:** The frontend loads the Razorpay checkout overlay. The user completes the payment, and Razorpay returns payment tokens.
4. **Backend Verification Route:** `POST /api/payments/verify` computes the HMAC SHA-256 signature to verify the payment.
5. **State Update:** If verified, the payment is saved to the database with **`AWAITING_APPROVAL`** status. The frontend shows a success toast and displays a pending badge in the UI.

<a id="workflow-e"></a>
### Workflow E: Claim Confirmation & Ledger Completion
1. **Trigger:** The creditor logs in, sees the payment under **Payments Awaiting Your Confirmation**, and clicks **Confirm Receipt**.
2. **Frontend Dispatch:** Triggers `api.payments.approvePayment(paymentId)` in `api.js`.
3. **Backend Route:** `POST /api/payments/{paymentId}/approve` reaches `PaymentController.java`.
4. **Service & DB Write:** `PaymentService.java` sets the status to **`COMPLETED`** and saves it to the database.
5. **Frontend State Update:** The UI refetches balances and payments. The alert badge disappears, and balances are updated to reflect the completed payment.

---

<a id="api-routes"></a>
## 📋 API Route Registry (Backend Reference)

All requests to endpoints (except `/api/auth/**` and `/api/health/**`) must include the header `Authorization: Bearer <token>`.

### 🔐 Authentication (`com.example.backend.auth.controller.AuthController`)
* `POST /api/auth/signup` - Register a new account. Expects `RegisterRequest` DTO.
* `POST /api/auth/login` - Authenticate credentials. Returns a JWT token.

### 👤 User Profile Management (`com.example.backend.auth.controller.UserController`)
* `GET /api/users/profile` - Get the current authenticated user's profile card.
* `PUT /api/users/profile` - Update the user's name or phone number.
* `GET /api/users/lookup?identifier={val}` - Find a user by Email or Phone Number.
* `GET /api/users/{userId}` - Fetch user details by ID.

### 👥 Group Administration (`com.example.backend.controller.GroupController`)
* `POST /api/groups` - Create a group. Expects `{ name, type, memberIds }`.
* `GET /api/groups` - Fetch all groups the user is a member of.
* `GET /api/groups/{groupId}` - Fetch details of a single group.
* `PUT /api/groups/{groupId}/rename` - Rename a group.
* `DELETE /api/groups/{groupId}` - Delete a group (cascades to delete all its expenses and payments).

### 💸 Expense Logger (`com.example.backend.controller.ExpenseController`)
* `POST /api/expenses` - Create an expense and calculate splits.
* `PUT /api/expenses/{expenseId}` - Edit an expense's details and recalculate splits.
* `DELETE /api/expenses/{expenseId}` - Delete an expense (cascades to delete its payment logs).
* `GET /api/expenses/group/{groupId}?page={X}&size={Y}` - Fetch paginated chronological expenses.

### ⚖️ Balance sheets & Settlements (`com.example.backend.controller.BalanceController` & `com.example.backend.controller.PaymentController`)
* `GET /api/balances/group/{groupId}/user/{userId}` - Fetch raw individual balance sheet details.
* `GET /api/balances/group/{groupId}/simplify?algo={GREEDY|DFS}` - Run path optimization engines on group balances.
* `POST /api/payments/order` - Create a new transaction order with Razorpay.
* `POST /api/payments/verify` - Cryptographically verify online payments and save as `AWAITING_APPROVAL`.
* `POST /api/payments/cash` - Record manual cash settlement.
* `POST /api/payments/{paymentId}/approve` - Accept a pending payment claim, changing its status to `COMPLETED`.
* `POST /api/payments/{paymentId}/reject` - Reject a pending payment claim, changing its status to `REJECTED`.
* `GET /api/payments/group/{groupId}` - Fetch all transactions logged within a group.

### 🩺 System Diagnostics (`com.example.backend.controller.HealthCheckController`)
* `GET /api/health/db` - Verifies database connectivity and returns Atlas diagnostic response state.
