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