# 💸 FairShare - Bill Splitting & Settlement Application

FairShare is a simple bill splitting web application (similar to Splitwise). It helps groups of friends manage shared expenses, calculates who owes how much to whom, and simplifies payments (using Greedy and DFS algorithms) so that people have to make the fewest payments possible. Users can settle their debts using Cash or online payments via Razorpay.

---

<a id="index"></a>
## 📖 Table of Contents

| Topic / Component | Sub-Sections | Description |
| :--- | :--- | :--- |
| **[1. How It Works (Architecture)](#technical-architecture)** | • Simple System Diagram | An overview of the frontend, backend, and database layers. |
| **[2. Setup Guide & Test Data](#setup)** | • [Backend Setup](#backend-setup)<br>• [Frontend Setup](#frontend-setup)<br>• [Testing Details](#testing-details)<br>• [Production Deployment](#production-deployment) | Setup instructions, test credentials, Razorpay test cards, and Render/Vercel guides. |
| **[3. Expense & Split Logic](#business-logic)** | • [Balance Formula](#balance-formula)<br>• [Splitting Options](#splitting-strategies)<br>• [Direct vs. Indirect Payments](#direct-vs-indirect) | How balances are calculated and how Equal, Exact, and Percentage splits work. |
| **[4. Debt Simplification (Reducing Payments)](#simplification-algorithms)** | • [Greedy Method](#greedy-simplification)<br>• [DFS Method](#dfs-simplification) | Explaining the two methods we use to minimize the number of payments. |
| **[5. Database Structure & Rules](#database-schemas)** | • [Tables & Fields](#db-entities)<br>• [Integrity Rules](#ledger-rules) | The database tables (collections) and how we keep the data clean and consistent. |
| **[6. FIFO Payment Matching](#fifo-ledger)** | • [Matching Steps](#fifo-mechanism)<br>• [Split Status Flow](#split-state-diagram) | How we match payments to individual expense splits chronologically. |
| **[7. Payment States & Rules](#settlement-logic)** | • [Cash Payment Rules](#manual-cash-rules)<br>• [Razorpay Online Payment](#razorpay-flow) | Rules for cash payments and online payments. |
| **[8. Step-by-Step Flows](#workflows)** | • [User SignUp](#workflow-a)<br>• [Create Group](#workflow-b)<br>• [Add Expense](#workflow-c)<br>• [Pay Online](#workflow-d)<br>• [Confirm Payment](#workflow-e) | What happens step-by-step when a user performs actions in the UI. |
| **[9. API Routes Reference](#api-routes)** | • Backend Routes List | A list of all backend URL paths available in the application. |

---

<a id="technical-architecture"></a>
## 🏗️ How It Works (Architecture)

```
   ┌──────────────────────────────────────────────────────────┐
   │                     REACT FRONTEND                       │
   │           (User Interface, Forms, Buttons, Tabs)         │
   └─────────────────────────────┬────────────────────────────┘
                                 │
                     API Calls   │   Razorpay Checkout Pop-up
                     (JSON Data) │   (For Online Payments)
                                 ▼
   ┌──────────────────────────────────────────────────────────┐
   │                    SPRING BOOT BACKEND                   │
   │        (Processes Requests, Runs Math & Algorithms)      │
   └─────────────────────────────┬────────────────────────────┘
                                 │
                   Saves/Fetches │
                   Data          ▼
   ┌──────────────────────────────────────────────────────────┐
   │                     MONGODB DATABASE                     │
   │   (Stores Users, Groups, Expenses, and Payment records)  │
   └─────────────────────────── ──────────────────────────────┘
```

* **Frontend:** Built with React, Vite, and Tailwind CSS. All communications with the backend are handled in `api.js`.
* **Backend:** Built with Spring Boot (Java). Secures endpoints using JWT authentication tokens.
* **Database:** MongoDB stores all the data.

---

<a id="setup"></a>
## ⚙️ Setup Guide

<a id="backend-setup"></a>
### Backend Setup
1. Create a file named `.env` inside the `backend/` directory:
   ```properties
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/FairShare
   JWT_SECRET=FAIRSHARE_SECRET_TOKEN_FOR_DEV_ONLY_SHOULD_BE_256_LONG
   RAZORPAY_KEY_ID=rzp_test_YourKeyId
   RAZORPAY_KEY_SECRET=YourKeySecret
   FRONTEND_URL=http://localhost:5173
   ```
2. Start the backend server:
   ```bash
   cd backend
   mvn spring-boot:run
   ```

<a id="frontend-setup"></a>
### Frontend Setup
1. Create a file named `.env` inside the `frontend/` directory:
   ```properties
   VITE_API_BASE_URL=http://localhost:8080
   VITE_FRONTEND_URL=http://localhost:5173
   ```
2. Run the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

---

<a id="testing-details"></a>
## 🧪 Testing Credentials & Payment Info

You can use the following pre-created test accounts to log in and try out the application:

### 1. Test Users (Email - Password)
* `user1@gmail.com` - `User1`
* `user2@gmail.com` - `user2`
* `user3@gmail.com` - `user3`

### 2. Razorpay Test Cards
When using the **Razorpay** checkout option to settle up balances, you can test various payment scenarios using the following card details. Use **any future expiration date** (e.g. `12/30`) and a **random 3-digit CVV** (e.g. `999`):

| Card Network | Card Number | CVV & Expiry Date |
| :--- | :--- | :--- |
| **Visa** | `4100 2800 0000 1007` | Any future date & 3-digit CVV |
| **Mastercard** | `5500 6700 0000 1002` | Any future date & 3-digit CVV |
| **RuPay** | `6527 6589 0000 1005` | Any future date & 3-digit CVV |
| **Diners Club** | `3608 280009 1007` | Any future date & 3-digit CVV |
| **Amex** | `3402 560004 01007` | Any future date & 3-digit CVV |

---

<a id="production-deployment"></a>
## 🚀 Production Deployment Guide

We can host the frontend on **Vercel** and the backend on **Render** using the instructions below.

### 1. Backend Deployment (Render)
Render is used to host the Java Spring Boot Backend using the pre-configured `Dockerfile`:
1. Log in to your [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
2. Connect your GitHub repository.
3. In the creation form:
   * **Name:** `fairshare-backend`
   * **Root Directory:** `backend`
   * **Runtime:** Select **Docker** (it will automatically compile and run the backend using `Dockerfile`).
4. Under **Advanced**, click **Add Environment Variable** and enter the following keys:
   * `MONGO_URI` = `mongodb+srv://...` (your MongoDB Atlas connection string)
   * `JWT_SECRET` = `your_secret_key`
   * `RAZORPAY_KEY_ID` = `rzp_test_...`
   * `RAZORPAY_KEY_SECRET` = `your_razorpay_secret`
   * `FRONTEND_URL` = `https://your-frontend-app.vercel.app` (your Vercel frontend URL)
5. Click **Deploy Web Service**. Render will build the container and provide a public URL (e.g. `https://fairshare-backend.onrender.com`).

### 2. Frontend Deployment (Vercel)
Vercel is used to host the React Frontend:
1. Log in to your [Vercel Dashboard](https://vercel.com/) and click **Add New > Project**.
2. Connect your GitHub repository.
3. In the project settings:
   * **Framework Preset:** Select **Vite**.
   * **Root Directory:** Select `frontend`.
4. Click on **Environment Variables** and add:
   * `VITE_API_BASE_URL` = `https://fairshare-backend.onrender.com` (your Render backend API URL)
   * `VITE_FRONTEND_URL` = `https://your-frontend-app.vercel.app` (your frontend Vercel URL)
5. Click **Deploy**. Vercel will host your client bundle.

---

<a id="business-logic"></a>
## 📊 Expense & Split Logic

<a id="balance-formula"></a>
### Balance Formula
A user's balance inside a group is calculated as:
$$\text{Net Balance} = \text{Total Paid for Expenses} - \text{Total Owed Shares} + \text{Total Settlements Received} - \text{Total Settlements Paid}$$

* **Positive Balance:** The group owes you money.
* **Negative Balance:** You owe money to the group.

<a id="splitting-strategies"></a>
### Splitting Options (Equal, Exact, Percentage)
When you add an expense, you can choose how to split it:
1. **Equal Split:** The bill is divided equally among everyone selected.
2. **Exact Split:** You input the exact rupee amount that each person owes.
3. **Percentage Split:** You input what percentage of the bill each person pays (must add up to 100%).

<a id="direct-vs-indirect"></a>
### Direct vs. Indirect Payments
When we simplify debts, middleman payments are bypassed. For example, if A owes B ₹100, and B owes C ₹100, the system simplifies this so **A pays C ₹100 directly**.
The backend handles this calculation dynamically. This ensures B's balance sheet is cleared even though A paid C directly.

---

<a id="simplification-algorithms"></a>
## 🧮 Debt Simplification (Reducing Payments)

The application has two options to simplify group debts (found in `DfsDebtSimplifier.java` and `GreedyDebtSimplifier.java`).

<a id="greedy-simplification"></a>
### Greedy Method (Fast matching)
1. Calculate the net balance of every user in the group.
2. Separate them into two groups: **People who owe money** (debtors) and **People who are owed money** (creditors).
3. Sort both lists.
4. Match the person who owes the most money with the person who is owed the most money:
   * Record a payment between them.
   * Subtract the payment amount from their balances.
   * If anyone still owes or is owed money, put them back in the list and repeat.

<a id="dfs-simplification"></a>
### DFS Method (Removes circular loops)
This method looks for circular loops (e.g. A owes B, B owes C, and C owes A) and cancels them out.
* The system looks at all debt paths in a group.
* It detects circular loops, finds the smallest debt in that loop, and subtracts it from all debts in the loop (effectively breaking the loop).
* This ensures that no one is paying money that just ends up coming back to them.

---

<a id="database-schemas"></a>
## 📂 Database Structure & Rules

We store the application data in four MongoDB tables (collections).

<a id="db-entities"></a>
### 1. Tables & Fields
* **`users`:** Stores user profiles.
  * Fields: `id`, `name`, `email`, `phoneNumber`, `password` (secured using BCrypt hashing).
* **`groups`:** Stores groups.
  * Fields: `id`, `name`, `type` (`HOME`, `TRIP`, `COUPLES`, `OTHER`), `memberIds` (list of users in the group).
* **`expenses`:** Stores individual bills added by users.
  * Fields: `id`, `groupId`, `description`, `totalAmount`, `paidById` (who paid), `splitType`, `splitDetails` (list of how much each user owes).
* **`payments`:** Stores payments recorded to settle debts.
  * Fields: `id`, `groupId`, `payerId` (who paid), `receiverId` (who received), `amount`, `paymentMethod` (`CASH` or `RAZORPAY`), `status` (`PENDING`, `AWAITING_APPROVAL`, `COMPLETED`, `REJECTED`), and Razorpay transaction IDs.

<a id="ledger-rules"></a>
### 2. Integrity Rules
* **Cascade Deletes:** If you delete an expense, all payment records linked to it are automatically deleted. If you delete a group, all its expenses and payments are deleted. This prevents old, broken data from staying in the database.
* **On-Demand Balances:** Balances are not saved as static numbers. The system calculates balances fresh every time by adding up all expenses and payments. This prevents calculations from getting out of sync.
* **Zero-Sum Group Balance:** In any group, the sum of all members' balances always equals exactly zero. This proves the math is correct:
  $$\sum \text{Member Balances} = 0$$

---

<a id="fifo-ledger"></a>
## 📑 FIFO Payment Matching

Since payments are logged for a group rather than against a specific bill, the frontend must decide which bills are paid. We use a **First-In, First-Out (FIFO)** approach in `ExpenseCard.jsx`:

<a id="fifo-mechanism"></a>
### Matching Steps
1. Sort all expenses and payments chronologically by date.
2. For each expense, look at the individual splits (who owes what).
3. Match payments to splits chronologically:
   * **Completed payments:** Clear the oldest unpaid split. Once fully paid, the split shows a **`Settled`** badge.
   * **Pending payments (`AWAITING_APPROVAL`):** Match the oldest active split and label it as **`Awaiting approval`**.
   * If a split has no matching payment, it shows as unpaid with the **`Owes ₹X`** label.

<a id="split-state-diagram"></a>
### Split Status Flow
```
         +───────────────+
         │   UNSETTLED   │ (Split is unpaid)
         +───────┬───────+
                 │
                 │ User logs a payment
                 ▼
     +───────────────────────+
     │   AWAITING_APPROVAL   │ (Waiting for receiver to confirm)
     +───────┬───────────┬───+
             │           │
    Receiver │           │ Receiver
    approves │           │ rejects
             ▼           ▼
        +─────────+   +───────────────+
        │ SETTLED │   │   UNSETTLED   │
        +─────────+   +───────────────+
```

---

<a id="settlement-logic"></a>
## 🔐 Payment States & Rules

Payments can be marked as `PENDING`, `AWAITING_APPROVAL`, `COMPLETED`, or `REJECTED`.

<a id="manual-cash-rules"></a>
### Cash Payment Rules
* **Receiver records cash:** If the person receiving the money records a cash payment, it is marked **`COMPLETED`** immediately (because they already got the money).
* **Payer records cash:** If the person paying the money records it, it is marked **`AWAITING_APPROVAL`**. The receiver must log in and click "Confirm" to make it **`COMPLETED`**.

<a id="razorpay-flow"></a>
### Razorpay Online Payment
1. **Create Order:** The frontend requests a payment order. The backend requests an Order ID from Razorpay.
2. **Open Checkout Widget:** The frontend opens the Razorpay pop-up. The user enters card/UPI details and completes the payment.
3. **Verify:** The frontend sends the payment signature tokens back to the backend. The backend verifies the signature cryptographically to make sure the payment was authentic.
4. **Approve:** The payment is saved as **`AWAITING_APPROVAL`** until the receiver confirms receipt, changing it to **`COMPLETED`**.

---

<a id="workflows"></a>
## 🔄 Step-by-Step Flows

<a id="workflow-a"></a>
### Workflow A: User SignUp
1. User enters name, email, phone, and password in `Register.jsx` and clicks **Sign Up**.
2. Frontend calls `api.auth.signup(...)` in `api.js`.
3. Backend controller intercepts the request, checks if email/phone is unique, encrypts the password, saves the user in the database, and returns a JWT login token.
4. Frontend saves the user profile, sets authentication state, and redirects the user to `Dashboard.jsx`.

<a id="workflow-b"></a>
### Workflow B: Create Group
1. User clicks **Create Group** on the Dashboard, fills in name and invites members.
2. Frontend calls `api.groups.createGroup(...)` in `api.js`.
3. Backend controller saves the new group document in MongoDB.
4. Frontend appends the new group to the dashboard list and re-renders the UI.

<a id="workflow-c"></a>
### Workflow C: Add Expense
1. User clicks **Add Expense** inside a group, inputs amount, description, payer, split strategy, and saves.
2. Frontend calls `api.expenses.createExpense(...)` in `api.js`.
3. Backend `ExpenseService.java` calculates the split share for each selected member and saves the expense document.
4. Frontend closes the modal, refetches balances, and re-renders the expense history cards.

<a id="workflow-d"></a>
### Workflow D: Pay Online (Razorpay)
1. Debtor clicks **Settle Up** in `SettlePaymentModal.jsx`, selects **Razorpay**, and clicks **Pay Now**.
2. Frontend requests Razorpay order details from the backend (`POST /api/payments/order`).
3. Frontend launches the Razorpay pop-up widget. The user pays.
4. Frontend sends Razorpay transaction tokens to the backend (`POST /api/payments/verify`) for signature validation.
5. The backend validates the payment, saves the payment as `AWAITING_APPROVAL`, and the frontend displays a pending badge in the UI.

<a id="workflow-e"></a>
### Workflow E: Confirm Payment
1. The receiver logs in, sees a notification banner in the group view, and clicks **Confirm Receipt**.
2. Frontend calls `api.payments.approvePayment(...)` in `api.js`.
3. Backend sets the payment status to `COMPLETED` and saves it.
4. Frontend refetches balances, and the payer's debt is cleared.

---

<a id="api-routes"></a>
## 📋 API Routes Reference

All backend requests (except for Sign Up, Login, and Health Check) must include the header `Authorization: Bearer <your_jwt_token>`.

### 🔐 Authentication Endpoints
* `POST /api/auth/signup` - Register a new account.
* `POST /api/auth/login` - Login to an account and receive a JWT token.

### 👤 User Endpoints
* `GET /api/users/profile` - Get the current user's profile card.
* `PUT /api/users/profile` - Update profile name and phone number.
* `GET /api/users/lookup?identifier={val}` - Find a user's details by Email or Phone Number.
* `GET /api/users/{userId}` - Get basic user profile details by ID.

### 👥 Group Endpoints
* `POST /api/groups` - Create a new group.
* `GET /api/groups` - Get all groups the current user belongs to.
* `GET /api/groups/{groupId}` - Get details of a single group.
* `PUT /api/groups/{groupId}/rename` - Rename a group.
* `DELETE /api/groups/{groupId}` - Delete a group (deletes all group expenses and payments).

### 💸 Expense Endpoints
* `POST /api/expenses` - Create a new expense.
* `PUT /api/expenses/{expenseId}` - Edit an expense.
* `DELETE /api/expenses/{expenseId}` - Delete an expense.
* `GET /api/expenses/group/{groupId}?page={X}&size={Y}` - Get list of bills in a group (paginated).

### ⚖️ Balance & Settlement Endpoints
* `GET /api/balances/group/{groupId}/user/{userId}` - Get net balances for a user.
* `GET /api/balances/group/{groupId}/simplify?algo={GREEDY|DFS}` - Run Greedy or DFS debt simplification.
* `POST /api/payments/order` - Start a Razorpay payment order.
* `POST /api/payments/verify` - Verify Razorpay payment signature.
* `POST /api/payments/cash` - Record a manual cash payment.
* `POST /api/payments/{paymentId}/approve` - Approve a pending payment claim.
* `POST /api/payments/{paymentId}/reject` - Reject a pending payment claim.
* `GET /api/payments/group/{groupId}` - Get all payments recorded in a group.

### 🩺 Diagnostic Endpoints
* `GET /api/health/db` - Verifies database connectivity.
