// ============================================================
// APP INIT
// ============================================================
// Check if app already initialized
if (typeof window.appInitialized === 'undefined') {
    window.appInitialized = true;

    window.addEventListener('DOMContentLoaded', () => {
        // Check if already logged in
        const token = localStorage.getItem('travelos_token');
        if (token) {
            window.authToken = token;
            // Load data and navigate
            loadState();
            updateUserUI();
            loadAllData().then(() => {
                setTimeout(() => navigate('dashboard'), 100);
            });
        } else {
            // Show login modal
            loadState();
            if (state.trips.length === 0) seedData();
            updateUserUI();
            setTimeout(() => navigate('dashboard'), 100);
            setTimeout(() => showAuthModal(), 1500);
        }
    });
}