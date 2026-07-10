// API Configuration
const API_URL = 'http://localhost:5000/api';

// Store token
let authToken = localStorage.getItem('travelos_token');

// API Helper
async function apiCall(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API Error');
    }
    return response.json();
}

// Auth APIs
export const auth = {
    register: (data) => apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    login: (data) => apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    logout: () => {
        localStorage.removeItem('travelos_token');
        authToken = null;
    },
    getToken: () => authToken,
    setToken: (token) => {
        authToken = token;
        localStorage.setItem('travelos_token', token);
    }
};

// Trip APIs
export const trips = {
    getAll: () => apiCall('/trips'),
    create: (data) => apiCall('/trips', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => apiCall(`/trips/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => apiCall(`/trips/${id}`, {
        method: 'DELETE'
    })
};

// Expense APIs
export const expenses = {
    getAll: (tripId) => apiCall(`/expenses${tripId ? `?tripId=${tripId}` : ''}`),
    create: (data) => apiCall('/expenses', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => apiCall(`/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => apiCall(`/expenses/${id}`, {
        method: 'DELETE'
    }),
    getSummary: (tripId) => apiCall(`/expenses/summary/${tripId}`)
};

// Itinerary APIs
export const itinerary = {
    get: (tripId) => apiCall(`/itinerary/${tripId}`),
    create: (data) => apiCall('/itinerary', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => apiCall(`/itinerary/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => apiCall(`/itinerary/${id}`, {
        method: 'DELETE'
    })
};

// Packing APIs
export const packing = {
    get: (tripId) => apiCall(`/packing/${tripId}`),
    update: (tripId, items) => apiCall(`/packing/${tripId}`, {
        method: 'PUT',
        body: JSON.stringify({ items })
    })
};

// Analytics
export const analytics = {
    get: (tripId) => apiCall(`/analytics/${tripId}`)
};