# FairShare - Bill Splitting Application

FairShare is a full-stack bill splitting application (similar to Splitwise) designed to manage shared group expenses, handle custom split options (Equal, Exact, Percentage), and automatically optimize/simplify transactions using custom algorithms (Greedy and DFS).

---

## ☕ Spring Boot (Java) Backend

### Prerequisites
* Java JDK 21+
* MongoDB database instance (local or MongoDB Atlas)
* Maven (included wrapper `./mvnw`)

### Getting Started

1. **Environment Variables Configuration**:
   Create a `.env` file in the `backend/` directory:
   ```properties
   MONGO_URI=mongodb+srv://<username>:<password>@your-cluster.mongodb.net/FairShare
   JWT_SECRET=FAIRSHARE_SECRET_TOKEN_FOR_DEV_ONLY_SHOULD_BE_256_LONG
   ```

2. **Start the Application**:
   Navigate to the `backend` folder and run it with the Maven wrapper:
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
   The backend server will start on [http://localhost:8080](http://localhost:8080).

---

### Backend API Reference

#### 🔐 Authentication

##### 1. Sign Up
* **Method**: `POST`
* **URL**: `/api/auth/signup`
* **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword"
}
```
* **Sample Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "type": "Bearer",
  "userId": "64bf6228...",
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

##### 2. Login
* **Method**: `POST`
* **URL**: `/api/auth/login`
* **Request Body**:
```json
{
  "email": "jane@example.com",
  "password": "securepassword"
}
```
* **Sample Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "type": "Bearer",
  "userId": "64bf6228...",
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

---

#### 👤 User Profile Management

##### 3. Search / Lookup User
* **Method**: `GET`
* **URL**: `/api/users/lookup?identifier={email-or-phone}`
* **Headers**: `Authorization: Bearer <token>`
* **Sample Request**: `/api/users/lookup?identifier=jane@example.com`
* **Sample Response**:
```json
{
  "id": "64bf6228...",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phoneNumber": "+1234567890"
}
```

##### 4. View Current Profile
* **Method**: `GET`
* **URL**: `/api/users/profile`
* **Headers**: `Authorization: Bearer <token>`
* **Sample Response**:
```json
{
  "id": "64bf6228...",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phoneNumber": "+1234567890",
  "createdAt": "2026-06-30T14:02:46.000Z"
}
```

##### 5. Edit Current Profile
* **Method**: `PUT`
* **URL**: `/api/users/profile`
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
```json
{
  "name": "Jane Smith",
  "phoneNumber": "+1987654321"
}
```
* **Sample Response**:
```json
{
  "id": "64bf6228...",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phoneNumber": "+1987654321",
  "createdAt": "2026-06-30T14:02:46.000Z"
}
```

---

#### 👥 Groups

##### 6. Create Group
* **Method**: `POST`
* **URL**: `/api/groups`
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
```json
{
  "name": "Summer Trip 2026",
  "type": "TRIP",
  "memberIds": ["64bf6228...", "64c87341..."]
}
```
*(Available Types: `HOME`, `TRIP`, `COUPLES`, `OTHER`)*
* **Sample Response**:
```json
{
  "id": "64d9b152...",
  "name": "Summer Trip 2026",
  "type": "TRIP",
  "memberIds": ["64bf6228...", "64c87341..."],
  "createdAt": "2026-06-30T14:15:30.123Z"
}
```

##### 7. Get Group by ID
* **Method**: `GET`
* **URL**: `/api/groups/{groupId}`
* **Headers**: `Authorization: Bearer <token>`
* **Sample Response**:
```json
{
  "id": "64d9b152...",
  "name": "Summer Trip 2026",
  "type": "TRIP",
  "memberIds": ["64bf6228...", "64c87341..."],
  "createdAt": "2026-06-30T14:15:30.123Z"
}
```

##### 8. Get Groups for a User
* **Method**: `GET`
* **URL**: `/api/groups?userId={userId}`
* **Headers**: `Authorization: Bearer <token>`
* **Sample Response**:
```json
[
  {
    "id": "64d9b152...",
    "name": "Summer Trip 2026",
    "type": "TRIP",
    "memberIds": ["64bf6228...", "64c87341..."],
    "createdAt": "2026-06-30T14:15:30.123Z"
  }
]
```

---

#### 💸 Expenses

##### 9. Create Expense
* **Method**: `POST`
* **URL**: `/api/expenses`
* **Headers**: `Authorization: Bearer <token>`
* **Request Body (Equal Split)**:
```json
{
  "groupId": "64d9b152...",
  "description": "Airbnb Booking",
  "totalAmount": 300.00,
  "paidById": "64bf6228...",
  "splitType": "EQUAL",
  "splitDetails": [
    { "userId": "64bf6228..." },
    { "userId": "64c87341..." }
  ]
}
```
* **Request Body (Exact Split)**:
```json
{
  "groupId": "64d9b152...",
  "description": "Dinner",
  "totalAmount": 150.00,
  "paidById": "64bf6228...",
  "splitType": "EXACT",
  "splitDetails": [
    { "userId": "64bf6228...", "owedAmount": 100.00 },
    { "userId": "64c87341...", "owedAmount": 50.00 }
  ]
}
```
* **Request Body (Percentage Split)**:
```json
{
  "groupId": "64d9b152...",
  "description": "Car Rental",
  "totalAmount": 200.00,
  "paidById": "64bf6228...",
  "splitType": "PERCENTAGE",
  "splitDetails": [
    { "userId": "64bf6228...", "percentage": 60 },
    { "userId": "64c87341...", "percentage": 40 }
  ]
}
```
* **Sample Response**:
```json
{
  "id": "64e0a4f8...",
  "groupId": "64d9b152...",
  "description": "Airbnb Booking",
  "totalAmount": 300.00,
  "paidById": "64bf6228...",
  "splitType": "EQUAL",
  "splitDetails": [
    { "userId": "64bf6228...", "owedAmount": 150.00, "percentage": null },
    { "userId": "64c87341...", "owedAmount": 150.00, "percentage": null }
  ],
  "createdAt": "2026-06-30T14:20:00.123Z"
}
```

##### 10. Get Expenses for a Group (Paginated)
* **Method**: `GET`
* **URL**: `/api/expenses/group/{groupId}?page=0&size=10`
* **Headers**: `Authorization: Bearer <token>`
* **Sample Response**:
```json
{
  "content": [
    {
      "id": "64e0a4f8...",
      "groupId": "64d9b152...",
      "description": "Airbnb Booking",
      "totalAmount": 300.00,
      "paidById": "64bf6228...",
      "splitType": "EQUAL",
      "splitDetails": [
        { "userId": "64bf6228...", "owedAmount": 150.00, "percentage": null },
        { "userId": "64c87341...", "owedAmount": 150.00, "percentage": null }
      ],
      "createdAt": "2026-06-30T14:20:00.123Z"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10,
    "sort": {
      "empty": false,
      "sorted": true,
      "unsorted": false
    },
    "offset": 0,
    "unpaged": false,
    "paged": true
  },
  "size": 10,
  "number": 0,
  "sort": {
    "empty": false,
    "sorted": true,
    "unsorted": false
  },
  "numberOfElements": 1,
  "first": true,
  "last": true,
  "empty": false
}
```

---

#### ⚖️ Balances & Debt Simplification

##### 11. Get Balance Sheet for a User in a Group
* **Method**: `GET`
* **URL**: `/api/balances/group/{groupId}/user/{userId}`
* **Headers**: `Authorization: Bearer <token>`
* **Sample Response**:
```json
{
  "userVsBalance": {
    "64c87341...": -150.00,
    "64bf6228...": 150.00
  },
  "totalYouAreOwed": 150.00,
  "totalYouOwe": 0.00
}
```

##### 12. Simplify Group Debts (Optimized Cash Flow)
* **Method**: `GET`
* **URL**: `/api/balances/group/{groupId}/simplify?algo={GREEDY|DFS}`
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `algo`: Optimization engine selection. Defaults to `GREEDY`.
    * `GREEDY`: Fast priority-queue base matching approximation.
    * `DFS`: Optimal path search backtracking.
* **Sample Response**:
```json
[
  {
    "fromUserId": "64c87341...",
    "toUserId": "64bf6228...",
    "amount": 150.00
  }
]
```

---

#### 🩺 Health Checks

##### 13. Database Ping Diagnostic
* **Method**: `GET`
* **URL**: `/api/health/db`
* **Sample Response**:
```
MongoDB connection is healthy: {"ok": 1.0}
```

---

## ⚛️ React Frontend

### Prerequisites
* Node.js v26+
* npm

### Getting Started

1. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The local application will run on [http://localhost:5173](http://localhost:5173).

3. **Build for Production**:
   ```bash
   npm run build
   ```
