const API_BASE_URL = 'http://localhost:8080';

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch (jsonErr) {
        errorMessage = errorText || response.statusText;
      }
    } catch (e) {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }
  
  if (response.status === 204) return null;
  
  try {
    return await response.json();
  } catch (e) {
    return null;
  }
};

export const api = {
  // Authentication
  auth: {
    signup: (name, email, phoneNumber, password) => 
      fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, email, phoneNumber, password }),
      }).then(handleResponse),

    login: (email, password) => 
      fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password }),
      }).then(handleResponse),
  },

  // Users
  users: {
    lookup: (identifier) => 
      fetch(`${API_BASE_URL}/api/users/lookup?identifier=${encodeURIComponent(identifier)}`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    getUserById: (userId) => 
      fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    getProfile: () => 
      fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    updateProfile: (name, phoneNumber) => 
      fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ name, phoneNumber }),
      }).then(handleResponse),
  },

  // Groups
  groups: {
    getUserGroups: (userId) => 
      fetch(`${API_BASE_URL}/api/groups?userId=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    createGroup: (name, memberIds) => 
      fetch(`${API_BASE_URL}/api/groups`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, memberIds }),
      }).then(handleResponse),

    getGroupById: (groupId) => 
      fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    updateGroupName: (groupId, name) => 
      fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ name }),
      }).then(handleResponse),

    deleteGroup: (groupId) => 
      fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }).then(handleResponse),
  },

  // Expenses
  expenses: {
    createExpense: (groupId, description, totalAmount, paidById, splitType, splitDetails) => 
      fetch(`${API_BASE_URL}/api/expenses`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          groupId,
          description,
          totalAmount,
          paidById,
          splitType,
          splitDetails,
        }),
      }).then(handleResponse),

    getGroupExpenses: (groupId, page = 0, size = 10) => 
      fetch(`${API_BASE_URL}/api/expenses/group/${groupId}?page=${page}&size=${size}`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    updateExpense: (expenseId, description, totalAmount, paidById, splitType, splitDetails) => 
      fetch(`${API_BASE_URL}/api/expenses/${expenseId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          description,
          totalAmount,
          paidById,
          splitType,
          splitDetails,
        }),
      }).then(handleResponse),

    deleteExpense: (expenseId) => 
      fetch(`${API_BASE_URL}/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }).then(handleResponse),
  },

  // Balances & Debt Simplification
  balances: {
    getGroupBalances: (groupId, userId) => 
      fetch(`${API_BASE_URL}/api/balances/group/${groupId}/user/${userId}`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    simplifyGroupDebts: (groupId, algo = 'GREEDY') => 
      fetch(`${API_BASE_URL}/api/balances/group/${groupId}/simplify?algo=${algo}`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),
  },

  // Payments
  payments: {
    recordCash: (groupId, payerId, receiverId, amount, relatedExpenseId) => 
      fetch(`${API_BASE_URL}/api/payments/cash`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ groupId, payerId, receiverId, amount, relatedExpenseId }),
      }).then(handleResponse),

    createRazorpayOrder: (groupId, payerId, receiverId, amount, relatedExpenseId) => 
      fetch(`${API_BASE_URL}/api/payments/razorpay/order`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ groupId, payerId, receiverId, amount, relatedExpenseId }),
      }).then(handleResponse),

    verifyRazorpayPayment: (razorpayOrderId, razorpayPaymentId, razorpaySignature) => 
      fetch(`${API_BASE_URL}/api/payments/razorpay/verify`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ razorpayOrderId, razorpayPaymentId, razorpaySignature }),
      }).then(handleResponse),

    approvePayment: (paymentId) => 
      fetch(`${API_BASE_URL}/api/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: getHeaders(),
      }).then(handleResponse),

    rejectPayment: (paymentId) => 
      fetch(`${API_BASE_URL}/api/payments/${paymentId}/reject`, {
        method: 'POST',
        headers: getHeaders(),
      }).then(handleResponse),

    getGroupPayments: (groupId) => 
      fetch(`${API_BASE_URL}/api/payments/group/${groupId}`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),
  },
};
