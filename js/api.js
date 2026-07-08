// ============================================================
// API CONFIGURATION
// ============================================================
const getApiUrl = () => {
    // ✅ Production - Render backend (Vercel)
    if (window.location.hostname.includes('vercel.app')) {
        return 'https://travelos-mkpn.onrender.com/api';
    }
    // ✅ Production - Render backend (direct)
    if (window.location.hostname.includes('onrender.com')) {
        return 'https://travelos-mkpn.onrender.com/api';
    }
    // ✅ Development - Localhost
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1') {
        return localStorage.getItem('API_URL') || 'http://localhost:5001/api';
    }
    // ✅ Fallback - Render
    return 'https://travelos-mkpn.onrender.com/api';
};

const API_URL = getApiUrl();
let authToken = localStorage.getItem('travelos_token');

console.log('🌐 API URL:', API_URL);
console.log('📍 Hostname:', window.location.hostname);
console.log('🔑 Token exists:', !!authToken);

// ============================================================
// API HELPER
// ============================================================
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('travelos_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            if (response.status === 401) {
                localStorage.removeItem('travelos_token');
                if (typeof showAuthModal === 'function') {
                    showAuthModal();
                }
                throw new Error('Session expired. Please login again.');
            }
            throw new Error(error.error || `API Error: ${response.status}`);
        }
        return response.json();
    } catch (err) {
        console.error('❌ API Error:', err);
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            throw new Error('Cannot connect to server. Please check your internet connection.');
        }
        throw err;
    }
}

// ============================================================
// AUTH API
// ============================================================
const authAPI = {
    register: (data) => apiCall('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => apiCall('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => {
        localStorage.removeItem('travelos_token');
        authToken = null;
    },
    setToken: (token) => {
        authToken = token;
        localStorage.setItem('travelos_token', token);
    },
    getToken: () => localStorage.getItem('travelos_token'),
    isLoggedIn: () => !!localStorage.getItem('travelos_token')
};

// ============================================================
// TRIPS API
// ============================================================
const tripsAPI = {
    getAll: () => apiCall('/trips'),
    create: (data) => apiCall('/trips', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiCall(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiCall(`/trips/${id}`, { method: 'DELETE' })
};

// ============================================================
// EXPENSES API
// ============================================================
const expensesAPI = {
    getAll: (tripId) => apiCall(`/expenses${tripId ? `?tripId=${tripId}` : ''}`),
    create: (data) => apiCall('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiCall(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiCall(`/expenses/${id}`, { method: 'DELETE' }),
    getSummary: (tripId) => apiCall(`/expenses/summary/${tripId}`)
};

// ============================================================
// ANALYTICS API
// ============================================================
const analyticsAPI = {
    get: (tripId) => apiCall(`/analytics/${tripId}`)
};

// ============================================================
// PACKING API
// ============================================================
const packingAPI = {
    get: (tripId) => apiCall(`/packing/${tripId}`),
    update: (tripId, items) => apiCall(`/packing/${tripId}`, { 
        method: 'PUT', 
        body: JSON.stringify({ items }) 
    })
};

// ============================================================
// WEATHER API
// ============================================================
const weatherAPI = {
    get: (city) => apiCall(`/weather/${city}`),
    getByCoords: (lat, lon) => apiCall(`/weather/coordinates/${lat}/${lon}`)
};

// Make globally available
window.authAPI = authAPI;
window.tripsAPI = tripsAPI;
window.expensesAPI = expensesAPI;
window.analyticsAPI = analyticsAPI;
window.packingAPI = packingAPI;
window.weatherAPI = weatherAPI;
window.apiCall = apiCall;

console.log('📡 API Functions Loaded Successfully!');
console.log('🔗 API URL:', API_URL);