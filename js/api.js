// ============================================================
// API CONFIGURATION
// ============================================================
// Check if already declared to avoid duplicates
if (typeof window.API_URL === 'undefined') {
    
    const getApiUrl = () => {
        if (window.location.hostname.includes('vercel.app') || 
            window.location.hostname.includes('onrender.com')) {
            return 'https://travelos-mkpn.onrender.com/api';
        }
        return localStorage.getItem('API_URL') || 'http://localhost:5001/api';
    };

    window.API_URL = getApiUrl();
    
    // ✅ FIX: Token ko function se lo, variable se nahi
    const getToken = () => localStorage.getItem('travelos_token');
    const setToken = (token) => {
        if (token) {
            localStorage.setItem('travelos_token', token);
        } else {
            localStorage.removeItem('travelos_token');
        }
    };

    console.log('🌐 API URL:', window.API_URL);
    console.log('📍 Hostname:', window.location.hostname);
    console.log('🔑 Token exists:', !!getToken());

    // ============================================================
    // API HELPER - FIXED
    // ============================================================
    async function apiCall(endpoint, options = {}) {
        // ✅ Har request pe fresh token lo
        const token = getToken();
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log(`📤 ${endpoint} - Token: ${token.substring(0, 20)}...`);
        } else {
            console.warn(`⚠️ No token for ${endpoint}`);
        }
        
        try {
            const response = await fetch(`${window.API_URL}${endpoint}`, {
                ...options,
                headers
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                if (response.status === 401) {
                    console.error('❌ 401 - Token invalid/expired');
                    setToken(null);
                    if (typeof showAuthModal === 'function') {
                        showAuthModal();
                    }
                    throw new Error('Session expired. Please login again.');
                }
                throw new Error(error.error || `API Error: ${response.status}`);
            }
            return response.json();
        } catch (err) {
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                throw new Error('Cannot connect to server. Please check your internet connection.');
            }
            throw err;
        }
    }

    // ============================================================
    // AUTH API - FIXED
    // ============================================================
    const authAPI = {
        register: async (data) => {
            const result = await apiCall('/auth/register', { method: 'POST', body: JSON.stringify(data) });
            if (result.token) {
                setToken(result.token);
                console.log('✅ Token saved from register');
            }
            return result;
        },
        login: async (data) => {
            const result = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify(data) });
            if (result.token) {
                setToken(result.token);
                console.log('✅ Token saved from login');
            }
            return result;
        },
        logout: () => {
            setToken(null);
            console.log('✅ Logged out');
        },
        getToken: getToken,
        isLoggedIn: () => !!getToken()
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
    window.getToken = getToken;
    window.setToken = setToken;

    console.log('📡 API Functions Loaded Successfully!');
    console.log('🔑 Logged in:', authAPI.isLoggedIn());
}