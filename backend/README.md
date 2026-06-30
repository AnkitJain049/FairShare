# FairShare Backend API

Base URL: http://localhost:8080

## Authentication

### 1) Sign up
- Method: POST
- URL: /api/auth/signup
- Body:
```json
{
  "name": "John",
  "email": "john@example.com",
  "password": "123456"
}
```

### 2) Login
- Method: POST
- URL: /api/auth/login
- Body:
```json
{
  "email": "john@example.com",
  "password": "123456"
}
```

## Groups

### 3) Create group
- Method: POST
- URL: /api/groups
- Body:
```json
{
  "name": "Trip",
  "type": "GROUP",
  "memberIds": ["user1", "user2"]
}
```

### 4) Get group by id
- Method: GET
- URL: /api/groups/{groupId}

### 5) Get groups for a user
- Method: GET
- URL: /api/groups?userId={userId}

## Expenses

### 6) Create expense
- Method: POST
- URL: /api/expenses
- Body:
```json
{
  "groupId": "groupId",
  "description": "Dinner",
  "totalAmount": 100,
  "paidById": "user1",
  "splitType": "EQUAL",
  "splitDetails": [
    { "userId": "user1" },
    { "userId": "user2" }
  ]
}
```

### 7) Get expenses for a group
- Method: GET
- URL: /api/expenses/group/{groupId}

## Balances

### 8) Get balance sheet for a user
- Method: GET
- URL: /api/balances/group/{groupId}/user/{userId}

### 9) Simplify debts in a group
- Method: GET
- URL: /api/balances/group/{groupId}/simplify
- Optional query param:
  - algo=GREEDY
  - algo=DFS

## Users

### 10) Look up a user by email or phone number
- Method: GET
- URL: /api/users/lookup?identifier={email-or-phone}
- Example:
```http
GET /api/users/lookup?identifier=john@example.com
```
- Response:
```json
{
  "id": "userId",
  "name": "John",
  "email": "john@example.com",
  "phoneNumber": "1234567890"
}
```

## Health

### 11) Database health
- Method: GET
- URL: /api/health/db

## Error Testing Examples

### 12) Invalid group creation
- Method: POST
- URL: /api/groups
- Body:
```json
{
  "name": "Trip",
  "type": "GROUP",
  "memberIds": []
}
```

### 13) Missing group
- Method: GET
- URL: /api/groups/does-not-exist

### 14) Invalid expense split
- Method: POST
- URL: /api/expenses
- Body:
```json
{
  "groupId": "groupId",
  "description": "Dinner",
  "totalAmount": 100,
  "paidById": "user1",
  "splitType": "EXACT",
  "splitDetails": [
    { "userId": "user1", "owedAmount": 60 },
    { "userId": "user2", "owedAmount": 30 }
  ]
}
```

