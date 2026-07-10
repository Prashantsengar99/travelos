// ============================================================
// APP INIT
// ============================================================
if (typeof window.appInitialized === 'undefined') {
    window.appInitialized = true;

    window.addEventListener('DOMContentLoaded', () => {
        // ✅ Token check using authAPI
        if (authAPI.isLoggedIn()) {
            console.log('✅ User already logged in');
            loadState();
            updateUserUI();
            loadAllData().then(() => {
                setTimeout(() => navigate('dashboard'), 100);
            });
        } else {
            console.log('🔑 No token found, showing login');
            loadState();
            if (state.trips.length === 0) seedData();
            updateUserUI();
            setTimeout(() => navigate('dashboard'), 100);
            setTimeout(() => showAuthModal(), 1500);
        }
    });
}

// ============================================================
// PAGE TITLES
// ============================================================
const pageTitles = {
    dashboard: 'Dashboard',
    trips: 'My Trips',
    expenses: 'Expenses',
    analytics: 'Analytics',
    advisor: 'AI Budget Advisor',
    explore: 'Explore Destination',
    itinerary: 'Daily Itinerary',
    split: 'Split Expenses',
    converter: 'Currency Converter',
    packing: 'Packing Checklist',
    badges: 'Badges & Achievements',
    'split-calculator': '🧮 Split Calculator',
    'ai-planner': '🤖 AI Trip Planner'  // ✅ ADDED
};

// ============================================================
// NAVIGATION FUNCTION
// ============================================================
function navigate(page) {
    if (!authAPI.isLoggedIn()) {
        showAuthModal();
        return;
    }
    
    state.page = page;
    destroyCharts();
    
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.page === page);
    });
    
    // Update page title
    document.getElementById('pageTitle').textContent = pageTitles[page] || 'TravelOS';
    
    // Scroll to top
    const content = document.getElementById('content');
    content.scrollTop = 0;

    // ✅ DIRECT RENDER - AI PLANNER
    if (page === 'ai-planner') {
        console.log('🎯 AI Planner called directly');
        renderAIPlanner();
        return;
    }
    
    
    // Render functions
    const renderers = {
        dashboard: renderDashboard,
        trips: renderTrips,
        expenses: renderExpenses,
        analytics: renderAnalytics,
        advisor: renderAdvisor,
        explore: renderExplore,
        itinerary: renderItinerary,
        split: renderSplit,
        converter: renderConverter,
        packing: renderPacking,
        badges: renderBadges,
        'split-calculator': renderSplitCalculator,
      
    };
 
    if (renderers[page]) {
        renderers[page]();
    } else {
        console.warn('Page not found:', page);
        renderers.dashboard();
    }
    
    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('mobileOverlay').classList.remove('show');
}

// ============================================================
// SIDEBAR TOGGLE
// ============================================================
function toggleSidebar() {
    if (window.innerWidth <= 768) {
        toggleMobileSidebar();
    } else {
        state.sidebarCollapsed = !state.sidebarCollapsed;
        document.getElementById('sidebar').classList.toggle('collapsed', state.sidebarCollapsed);
    }
}

function toggleMobileSidebar() {
    document.getElementById('sidebar').classList.toggle('mobile-open');
    document.getElementById('mobileOverlay').classList.toggle('show');
}

// ============================================================
// AUTH FUNCTIONS
// ============================================================
function showAuthModal() {
    document.getElementById('authModal').classList.add('open');
    showLoginForm();
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('open');
}

function showLoginForm() {
    document.getElementById('authModalTitle').textContent = 'Login to TravelOS';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('authModalTitle').textContent = 'Create Account';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const data = await authAPI.login({ email, password });
        authAPI.setToken(data.token);
        state.user = data.user;
        saveState();
        closeAuthModal();
        toast(`Welcome back, ${data.user.name}!`, 'success');
        updateUserUI();
        await loadAllData();
        navigate('dashboard');
    } catch (err) {
        toast('Login failed: ' + err.message, 'danger');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    try {
        const data = await authAPI.register({ name, email, password });
        authAPI.setToken(data.token);
        state.user = data.user;
        saveState();
        closeAuthModal();
        toast(`Welcome to TravelOS, ${name}!`, 'success');
        updateUserUI();
        await loadAllData();
        navigate('dashboard');
    } catch (err) {
        toast('Registration failed: ' + err.message, 'danger');
    }
}

function handleLogout() {
    authAPI.logout();
    state.user = null;
    state.trips = [];
    state.expenses = [];
    state.activeTripId = null;
    saveState();
    updateUserUI();
    toast('Logged out successfully', 'info');
    showAuthModal();
}

function updateUserUI() {
    const name = state.user ? state.user.name : 'Traveller';
    const initial = name.charAt(0).toUpperCase();
    document.getElementById('userName').textContent = name;
    document.getElementById('userAvatar').textContent = initial;
    document.getElementById('topbarAvatar').textContent = initial;
}

// ============================================================
// DATA LOADING
// ============================================================
async function loadAllData() {
    if (!authAPI.isLoggedIn()) return;
    state.loading = true;
    try {
        const trips = await tripsAPI.getAll();
        state.trips = trips;
        
        if (state.activeTripId && !trips.find(t => getTripId(t) === state.activeTripId)) {
            state.activeTripId = trips.length > 0 ? getTripId(trips[0]) : null;
        } else if (!state.activeTripId && trips.length > 0) {
            state.activeTripId = getTripId(trips[0]);
        }
        
        if (state.activeTripId) {
            const expenses = await expensesAPI.getAll(state.activeTripId);
            state.expenses = expenses;
        }
        
        if (state.activeTripId) {
            try {
                const packing = await packingAPI.get(state.activeTripId);
                if (packing && packing.items) {
                    state.packingItems = packing.items;
                }
            } catch (e) {}
        }
        
        saveState();
    } catch (err) {
        console.error('Error loading data:', err);
        if (!loadState()) seedData();
    }
    state.loading = false;
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function showNotifications() {
    const t = getTrip(); 
    if (!t) return;
    const spent = totalSpent(), pct = Math.round((spent / t.budget) * 100);
    if (pct >= 80) toast(`You've spent ${pct}% of your budget. Slow down!`, 'danger');
    else if (pct >= 60) toast(`Budget usage at ${pct}%. Keep an eye on spending.`, 'warning');
    else toast(`Budget is healthy at ${pct}%. Great job!`, 'success');
}

// ============================================================
// CHANGE EXPLORE CITY
// ============================================================
function changeExploreCity(city) {
    const t = getTrip();
    const origDest = t ? t.destination : 'Jaipur';
    if (t) t.destination = city;
    renderExplore();
    if (t) t.destination = origDest;
}

// ============================================================
// SEED DATA (offline fallback)
// ============================================================
function seedData() {
    const today = new Date();
    const d = (offset) => { const dt = new Date(today); dt.setDate(dt.getDate() + offset); return dt.toISOString().split('T')[0]; };

    const trip = { _id: 'demo_trip', destination: 'Jaipur', startDate: d(-3), endDate: d(4), budget: 25000, currency: 'INR', travellers: 2, travelType: 'Friends', createdAt: Date.now() };
    state.trips = [trip];
    state.activeTripId = 'demo_trip';

    state.expenses = [
        { _id: uid(), tripId: 'demo_trip', category: 'flight', description: 'Indigo Flight Delhi-Jaipur', amount: 7500, date: d(-3), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'transport', description: 'Cab from Airport to Hotel', amount: 800, date: d(-3), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'hotel', description: 'Hotel Royal Heritage (2 nights)', amount: 6000, date: d(-3), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'food', description: 'Dinner at Handi Restaurant', amount: 1200, date: d(-3), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'food', description: 'Pyaaz Kachori breakfast', amount: 200, date: d(-2), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'transport', description: 'Auto to Amer Fort', amount: 350, date: d(-2), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'entertainment', description: 'Amer Fort entry tickets', amount: 500, date: d(-2), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'food', description: 'Lunch near Jal Mahal', amount: 650, date: d(-2), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'shopping', description: 'Jewellery at Johari Bazaar', amount: 2500, date: d(-2), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'food', description: 'Lassi at Lassiwala', amount: 150, date: d(-1), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'transport', description: 'Cab to Nahargarh Fort', amount: 600, date: d(-1), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'food', description: 'Dal Baati Churma dinner', amount: 900, date: d(-1), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'medical', description: 'Medicine from pharmacy', amount: 200, date: d(-1), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'shopping', description: 'Bandhani saree', amount: 1800, date: d(-1), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'food', description: 'Ghewar and sweets', amount: 350, date: d(0), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'transport', description: 'Ola to City Palace', amount: 250, date: d(0), createdAt: Date.now() },
        { _id: uid(), tripId: 'demo_trip', category: 'entertainment', description: 'City Palace tickets', amount: 400, date: d(0), createdAt: Date.now() },
    ];

    state.splitPayments = [
        { member: 'Rahul', amount: 7500, desc: 'Flight tickets' },
        { member: 'Rahul', amount: 6000, desc: 'Hotel booking' },
        { member: 'Prashant', amount: 3500, desc: 'Food & shopping' },
        { member: 'Prashant', amount: 800, desc: 'Cab rides' },
        { member: 'Rohit', amount: 2200, desc: 'Entry tickets & food' },
        { member: 'Sneha', amount: 1500, desc: 'Shopping & snacks' },
    ];

    saveState();
}

// ============================================================
// SAVE/LOCAL STATE (offline fallback)
// ============================================================
function saveState() {
    try {
        localStorage.setItem('travelos_state', JSON.stringify({
            trips: state.trips,
            activeTripId: state.activeTripId,
            expenses: state.expenses,
            packingItems: state.packingItems,
            badges: state.badges,
            splitPayments: state.splitPayments,
            user: state.user
        }));
    } catch(e) {}
}

function loadState() {
    try {
        const d = JSON.parse(localStorage.getItem('travelos_state'));
        if (d) {
            state.trips = d.trips || [];
            state.activeTripId = d.activeTripId || null;
            state.expenses = d.expenses || [];
            state.packingItems = d.packingItems || state.packingItems;
            state.badges = d.badges || state.badges;
            state.splitPayments = d.splitPayments || [];
            state.user = d.user || null;
            return true;
        }
    } catch(e) {}
    return false;
}

console.log('🚀 TravelOS App Loaded Successfully!');
console.log('📊 State:', state);
console.log('🔑 Logged In:', authAPI.isLoggedIn());
console.log('📦 Trips:', state.trips.length);
console.log('💰 Expenses:', state.expenses.length);