// ============================================================
// DASHBOARD RENDER
// ============================================================
function renderDashboard() {
    const t = getTrip();
    if (!t) {
        document.getElementById('content').innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;gap:16px;">
            <i class="fas fa-suitcase-rolling" style="font-size:48px;color:var(--text3);"></i>
            <h3 style="color:var(--text2);">No Active Trip</h3>
            <p style="color:var(--text3);font-size:14px;">Create your first trip to get started</p>
            <button class="btn btn-primary" onclick="navigate('trips')"><i class="fas fa-plus"></i> Create Trip</button>
        </div>`;
        return;
    }

    const spent = totalSpent(), remaining = t.budget - spent, pct = Math.min(100, Math.round((spent / t.budget) * 100));
    const dl = daysLeft(), totalDays = daysBetween(t.startDate, t.endDate);
    const tripPct = Math.min(100, Math.round(((totalDays - dl) / totalDays) * 100));
    const dailyLimit = dl > 0 ? Math.floor(remaining / dl) : 0;
    const healthColor = pct < 50 ? 'var(--success)' : pct < 75 ? 'var(--accent)' : pct < 90 ? 'var(--warning)' : 'var(--danger)';
    const healthLabel = pct < 50 ? 'Excellent' : pct < 75 ? 'Good' : pct < 90 ? 'Average' : 'Critical';
    const expenses = getExpenses();

    const dayMap = {};
    expenses.forEach(e => { dayMap[e.date] = (dayMap[e.date] || 0) + e.amount; });
    const dayLabels = Object.keys(dayMap).sort().map(d => { const dt = new Date(d); return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); });
    const dayValues = Object.keys(dayMap).sort().map(d => dayMap[d]);

    const catMap = {};
    expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });

    document.getElementById('content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div>
            <h1 style="font-size:28px;font-weight:900;">Welcome back, ${state.user ? state.user.name : 'Traveller'}</h1>
            <p style="color:var(--text2);margin-top:4px;font-size:14px;">${t.destination} trip — ${t.travelType} | ${t.travellers} traveller${t.travellers > 1 ? 's' : ''}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="window.open('split-calculator.html', '_blank')" class="btn btn-sm btn-ghost" title="Open Split Calculator">
                <i class="fas fa-calculator"></i> Split Calc
            </button>
            <button onclick="shareTrip()" class="btn btn-sm btn-ghost" title="Share Trip">
                <i class="fas fa-share-alt"></i> Share
            </button>
            <button onclick="downloadTripPDF()" class="btn btn-sm btn-ghost" title="Download Trip Summary PDF">
                <i class="fas fa-file-pdf"></i> PDF
            </button>
            <button onclick="downloadExcel()" class="btn btn-sm btn-ghost" title="Download Excel Report">
                <i class="fas fa-file-excel"></i> Excel
            </button>
            <button onclick="sendBudgetAlertEmail()" class="btn btn-sm btn-ghost" title="Send Budget Alert Email">
                <i class="fas fa-envelope"></i> Alert
            </button>
            <button onclick="openModal('expenseModal');document.getElementById('expDate').value=todayStr()" class="btn btn-primary">
                <i class="fas fa-plus"></i> Add Expense
            </button>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
        <div class="card stat-card amber fade-up">
            <div style="font-size:13px;color:var(--text2);font-weight:600;">Total Budget</div>
            <div style="font-size:28px;font-weight:900;margin-top:6px;font-family:'Outfit';">${fmt(t.budget)}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px;">${totalDays} days trip</div>
        </div>
        <div class="card stat-card red fade-up fade-up-d1">
            <div style="font-size:13px;color:var(--text2);font-weight:600;">Spent</div>
            <div style="font-size:28px;font-weight:900;margin-top:6px;font-family:'Outfit';color:var(--danger);">${fmt(spent)}</div>
            <div class="progress-bar" style="margin-top:8px;"><div class="progress-fill" style="width:${pct}%;background:${healthColor};"></div></div>
        </div>
        <div class="card stat-card green fade-up fade-up-d2">
            <div style="font-size:13px;color:var(--text2);font-weight:600;">Remaining</div>
            <div style="font-size:28px;font-weight:900;margin-top:6px;font-family:'Outfit';color:${remaining > 0 ? 'var(--success)' : 'var(--danger)'};">${fmt(remaining)}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px;">${dl} days left</div>
        </div>
        <div class="card stat-card cyan fade-up fade-up-d3">
            <div style="font-size:13px;color:var(--text2);font-weight:600;">Budget Health</div>
            <div style="display:flex;align-items:baseline;gap:8px;margin-top:6px;">
                <span style="font-size:28px;font-weight:900;font-family:'Outfit';color:${healthColor};">${100 - pct}%</span>
                <span class="badge" style="background:${healthColor}22;color:${healthColor};">${healthLabel}</span>
            </div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px;">Suggested limit: ${fmt(dailyLimit)}/day</div>
        </div>
        <div class="card stat-card cyan fade-up fade-up-d4">
            <div style="font-size:13px;color:var(--text2);font-weight:600;">⏰ Trip Countdown</div>
            <div style="font-size:28px;font-weight:900;margin-top:6px;font-family:'Outfit';color:var(--info);">
                ${dl > 0 ? `${dl} days` : 'Trip Over!'}
            </div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px;">
                ${dl > 0 ? `${Math.floor(dl/7)} weeks, ${dl%7} days left` : 'Time to plan next trip! 🚀'}
            </div>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:24px;">
        <div class="card fade-up fade-up-d2">
            <h4 style="font-size:15px;font-weight:700;margin-bottom:16px;">Daily Spending Trend</h4>
            <div style="height:220px;"><canvas id="dashLineChart"></canvas></div>
        </div>
        <div class="card fade-up fade-up-d3">
            <h4 style="font-size:15px;font-weight:700;margin-bottom:16px;">Category Breakdown</h4>
            <div style="height:220px;"><canvas id="dashPieChart"></canvas></div>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="card fade-up fade-up-d3">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h4 style="font-size:15px;font-weight:700;">Recent Expenses</h4>
                <button class="btn btn-ghost btn-sm" onclick="navigate('expenses')">View All</button>
            </div>
            <div style="max-height:280px;overflow-y:auto;">
                ${expenses.slice(-6).reverse().map(e => {
                    const cat = categories[e.category] || categories.others;
                    return `<div class="expense-item">
                        <div class="cat-icon ${cat.class}" style="margin-right:12px;"><i class="fas ${cat.icon}"></i></div>
                        <div style="flex:1;"><div style="font-size:14px;font-weight:600;">${e.description}</div><div style="font-size:12px;color:var(--text3);">${cat.label} · ${new Date(e.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div></div>
                        <div style="font-weight:700;font-family:'Outfit';color:var(--danger);">-${fmt(e.amount)}</div>
                    </div>`;
                }).join('')}
            </div>
        </div>

        <div class="card fade-up fade-up-d4">
            <h4 style="font-size:15px;font-weight:700;margin-bottom:16px;">Smart Alerts</h4>
            <div style="display:flex;flex-direction:column;gap:12px;">
                ${pct >= 80 ? `
                <div style="padding:14px;border-radius:12px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><i class="fas fa-exclamation-circle" style="color:var(--danger);"></i><span style="font-weight:700;color:var(--danger);">High Spending Alert</span></div>
                    <p style="font-size:13px;color:var(--text2);line-height:1.5;">You've already spent ${pct}% of your budget.</p>
                </div>
                ` : pct >= 60 ? `
                <div style="padding:14px;border-radius:12px;background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.15);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><i class="fas fa-exclamation-triangle" style="color:var(--warning);"></i><span style="font-weight:700;color:var(--warning);">Budget Warning</span></div>
                    <p style="font-size:13px;color:var(--text2);line-height:1.5;">You've used ${pct}% of your budget. Daily limit: ${fmt(dailyLimit)}</p>
                </div>
                ` : `
                <div style="padding:14px;border-radius:12px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.15);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><i class="fas fa-check-circle" style="color:var(--success);"></i><span style="font-weight:700;color:var(--success);">Budget Healthy</span></div>
                    <p style="font-size:13px;color:var(--text2);line-height:1.5;">You've used only ${pct}% of your budget. Great job! 👍</p>
                </div>
                `}
                <div style="padding:14px;border-radius:12px;background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.15);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><i class="fas fa-lightbulb" style="color:var(--accent);"></i><span style="font-weight:700;color:var(--accent);">Daily Budget Tip</span></div>
                    <p style="font-size:13px;color:var(--text2);line-height:1.5;">Spend no more than ${fmt(dailyLimit)} per day for the next ${dl} days.</p>
                </div>
                <div style="padding:14px;border-radius:12px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.15);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><i class="fas fa-chart-line" style="color:var(--success);"></i><span style="font-weight:700;color:var(--success);">Trip Progress</span></div>
                    <div class="progress-bar" style="margin:8px 0;"><div class="progress-fill" style="width:${tripPct}%;background:var(--success);"></div></div>
                    <p style="font-size:13px;color:var(--text2);">${tripPct}% completed · ${dl} days remaining</p>
                </div>
            </div>
        </div>
    </div>`;

    // Charts
    const lineCtx = document.getElementById('dashLineChart').getContext('2d');
    charts.dashLine = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: dayLabels.length ? dayLabels : ['No data'],
            datasets: [{
                label: 'Daily Spend',
                data: dayValues.length ? dayValues : [0],
                borderColor: '#F5A623',
                backgroundColor: 'rgba(245,166,35,0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#F5A623',
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8B8DA0', font: { size: 11 } } },
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8B8DA0', font: { size: 11 }, callback: v => '₹' + v.toLocaleString('en-IN') } }
            }
        }
    });

    const catLabels = Object.keys(catMap).map(k => (categories[k] || categories.others).label);
    const catValues = Object.values(catMap);
    const catColors = Object.keys(catMap).map(k => {
        const colors = { food: '#F97316', hotel: '#8B5CF6', transport: '#06B6D4', shopping: '#EC4899', entertainment: '#22C55E', medical: '#EF4444', flight: '#3B82F6', others: '#6B7280' };
        return colors[k] || '#6B7280';
    });
    const pieCtx = document.getElementById('dashPieChart').getContext('2d');
    charts.dashPie = new Chart(pieCtx, {
        type: 'doughnut',
        data: { labels: catLabels.length ? catLabels : ['No data'], datasets: [{ data: catValues.length ? catValues : [1], backgroundColor: catColors.length ? catColors : ['#333'], borderWidth: 0, hoverOffset: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#8B8DA0', font: { size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 } } } }
    });

    if (pct >= 75) document.getElementById('notifDot').style.display = 'block';
}

// ============================================================
// TRIP DETAILS WITH PDF BUTTON
// ============================================================
function renderTripDetails() {
    const t = getTrip();
    if (!t) return;
    
    const content = document.getElementById('content');
    const expenses = getExpenses();
    
    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
            <div>
                <h2 style="font-size:24px;font-weight:800;">${t.destination}</h2>
                <p style="color:var(--text2);font-size:14px;margin-top:4px;">
                    ${new Date(t.startDate).toLocaleDateString()} - ${new Date(t.endDate).toLocaleDateString()}
                </p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button onclick="shareTrip()" class="btn btn-primary">
                    <i class="fas fa-share-alt"></i> Share Trip
                </button>
                <button onclick="downloadTripPDF()" class="btn btn-ghost">
                    <i class="fas fa-file-pdf"></i> PDF
                </button>
                <button onclick="downloadExpensesPDF()" class="btn btn-ghost">
                    <i class="fas fa-file-pdf"></i> Expenses
                </button>
            </div>
        </div>
        
        <div class="card">
            <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">Trip Stats</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
                <div>
                    <div style="font-size:12px;color:var(--text3);">Total Budget</div>
                    <div style="font-size:20px;font-weight:800;">${fmt(t.budget)}</div>
                </div>
                <div>
                    <div style="font-size:12px;color:var(--text3);">Total Spent</div>
                    <div style="font-size:20px;font-weight:800;color:var(--danger);">${fmt(totalSpent())}</div>
                </div>
                <div>
                    <div style="font-size:12px;color:var(--text3);">Remaining</div>
                    <div style="font-size:20px;font-weight:800;color:var(--success);">${fmt(t.budget - totalSpent())}</div>
                </div>
                <div>
                    <div style="font-size:12px;color:var(--text3);">Expenses</div>
                    <div style="font-size:20px;font-weight:800;">${expenses.length}</div>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// PDF DOWNLOAD FUNCTIONS
// ============================================================

async function downloadTripPDF() {
    const t = getTrip();
    if (!t) {
        toast('No active trip!', 'warning');
        return;
    }
    
    const tripId = t._id || t.id;
    
    try {
        toast('Generating PDF...', 'info');
        
        const token = authAPI.getToken();
        const response = await fetch(`${API_URL}/trips/${tripId}/pdf`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to generate PDF');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trip-summary-${t.destination}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        toast('PDF downloaded successfully! 📄', 'success');
        
    } catch (err) {
        console.error('PDF Download Error:', err);
        toast('Failed to download PDF: ' + err.message, 'danger');
    }
}

async function downloadExpensesPDF() {
    const t = getTrip();
    if (!t) {
        toast('No active trip!', 'warning');
        return;
    }
    
    const tripId = t._id || t.id;
    
    try {
        toast('Generating expenses PDF...', 'info');
        
        const token = authAPI.getToken();
        const response = await fetch(`${API_URL}/trips/${tripId}/expenses-pdf`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to generate PDF');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses-${t.destination}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        toast('Expenses PDF downloaded successfully! 📄', 'success');
        
    } catch (err) {
        console.error('PDF Download Error:', err);
        toast('Failed to download PDF: ' + err.message, 'danger');
    }
}

// ============================================================
// EMAIL FUNCTIONS
// ============================================================

async function sendBudgetAlertEmail() {
    const t = getTrip();
    if (!t) {
        toast('No active trip!', 'warning');
        return;
    }
    
    const token = authAPI.getToken();
    const user = state.user;
    const spent = totalSpent();
    const pct = Math.round((spent / t.budget) * 100);
    
    try {
        toast('Sending email...', 'info');
        
        const response = await fetch(`${API_URL}/email/budget-alert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                tripId: t._id || t.id,
                userEmail: user.email,
                userName: user.name,
                tripDestination: t.destination,
                spent: spent,
                budget: t.budget,
                pct: pct
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send email');
        }
        
        toast('📧 Budget alert email sent successfully!', 'success');
        
    } catch (err) {
        console.error('Email Error:', err);
        toast('Failed to send email: ' + err.message, 'danger');
    }
}

async function sendTripSummaryEmail() {
    const t = getTrip();
    if (!t) {
        toast('No active trip!', 'warning');
        return;
    }
    
    const token = authAPI.getToken();
    const user = state.user;
    
    try {
        toast('Sending email...', 'info');
        
        const response = await fetch(`${API_URL}/email/trip-summary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userEmail: user.email,
                userName: user.name,
                trip: t
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send email');
        }
        
        toast('📊 Trip summary email sent successfully!', 'success');
        
    } catch (err) {
        console.error('Email Error:', err);
        toast('Failed to send email: ' + err.message, 'danger');
    }
}

// ============================================================
// TRIP SHARING FUNCTIONS
// ============================================================

async function shareTrip() {
    const t = getTrip();
    if (!t) {
        toast('No active trip!', 'warning');
        return;
    }
    
    const tripId = t._id || t.id;
    const token = authAPI.getToken();
    
    try {
        toast('Generating share link...', 'info');
        
        const response = await fetch(`${API_URL}/trips/${tripId}/share`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate share link');
        }
        
        const data = await response.json();
        showShareModal(data.shareUrl, data.trip);
        
    } catch (err) {
        console.error('Share Error:', err);
        toast('Failed to generate share link: ' + err.message, 'danger');
    }
}

function showShareModal(shareUrl, trip) {
    const existingModal = document.getElementById('shareModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'shareModal';
    modal.className = 'modal-overlay open';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal" style="max-width:500px;position:relative;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="font-size:20px;font-weight:800;">
                    <i class="fas fa-share-alt" style="color:var(--accent);"></i> Share Trip
                </h3>
                <button onclick="closeShareModal()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:20px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div style="background:var(--bg);border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid var(--border);">
                <p style="font-size:13px;color:var(--text2);margin-bottom:8px;">
                    <strong>${trip.destination}</strong> trip share link
                </p>
                <div style="display:flex;gap:8px;">
                    <input type="text" id="shareLinkInput" class="input-field" value="${shareUrl}" readonly style="flex:1;font-size:13px;">
                    <button onclick="copyShareLink()" class="btn btn-primary" style="white-space:nowrap;">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
            </div>
            
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
                <button onclick="shareViaWhatsApp()" class="btn btn-ghost" style="flex:1;justify-content:center;background:#25D366;color:#fff;border-color:#25D366;">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
                <button onclick="shareViaEmail()" class="btn btn-ghost" style="flex:1;justify-content:center;background:#EA4335;color:#fff;border-color:#EA4335;">
                    <i class="fas fa-envelope"></i> Email
                </button>
                <button onclick="shareViaTwitter()" class="btn btn-ghost" style="flex:1;justify-content:center;background:#1DA1F2;color:#fff;border-color:#1DA1F2;">
                    <i class="fab fa-twitter"></i> Twitter
                </button>
            </div>
            
            <div style="margin-top:16px;padding:12px;background:rgba(245,166,35,0.08);border-radius:8px;border:1px solid rgba(245,166,35,0.15);">
                <p style="font-size:12px;color:var(--text3);text-align:center;margin:0;">
                    💡 Share this link with friends to view trip details
                </p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.remove();
}

function copyShareLink() {
    const input = document.getElementById('shareLinkInput');
    if (!input) return;
    input.select();
    document.execCommand('copy');
    toast('Link copied to clipboard! 📋', 'success');
}

function shareViaWhatsApp() {
    const input = document.getElementById('shareLinkInput');
    if (!input) return;
    const url = input.value;
    const text = encodeURIComponent(`Check out my trip! 🚀\n\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareViaEmail() {
    const input = document.getElementById('shareLinkInput');
    if (!input) return;
    const url = input.value;
    const subject = encodeURIComponent('My Trip Plan');
    const body = encodeURIComponent(`Check out my trip plan!\n\n${url}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
}

function shareViaTwitter() {
    const input = document.getElementById('shareLinkInput');
    if (!input) return;
    const url = input.value;
    const text = encodeURIComponent('Check out my trip plan! 🚀');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

// ============================================================
// EXCEL EXPORT FUNCTION
// ============================================================

async function downloadExcel() {
    const t = getTrip();
    if (!t) {
        toast('No active trip!', 'warning');
        return;
    }
    
    const tripId = t._id || t.id;
    const token = authAPI.getToken();
    
    try {
        toast('Generating Excel report...', 'info');
        
        const response = await fetch(`${API_URL}/trips/${tripId}/excel`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to generate Excel');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses-${t.destination}-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        toast('Excel downloaded successfully! 📊', 'success');
        
    } catch (err) {
        console.error('Excel Download Error:', err);
        toast('Failed to download Excel: ' + err.message, 'danger');
    }
}

// ============================================================
// AI TRIP PLANNER - RENDER
// ============================================================

function renderAIPlanner() {
    console.log('✅ AI Planner Loaded!');
    
    const content = document.getElementById('content');
    
    content.innerHTML = `
    <div style="margin-bottom:24px;">
        <h2 style="font-size:24px;font-weight:800;">
            <i class="fas fa-robot" style="color:var(--accent);"></i> AI Trip Planner
        </h2>
        <p style="color:var(--text2);font-size:14px;margin-top:4px;">Get personalized trip plans powered by AI</p>
    </div>
    
    <div class="card" style="max-width:700px;margin-bottom:24px;">
        <form id="aiPlanForm" onsubmit="return false;">
            <div style="display:grid;gap:16px;">
                <div>
                    <label style="font-size:13px;font-weight:600;color:var(--text2);display:block;margin-bottom:6px;">📍 Destination</label>
                    <input type="text" class="input-field" id="aiDestination" placeholder="e.g., Jaipur, Goa, Kerala" required>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div>
                        <label style="font-size:13px;font-weight:600;color:var(--text2);display:block;margin-bottom:6px;">📅 Days</label>
                        <input type="number" class="input-field" id="aiDays" value="3" min="1" max="30" required>
                    </div>
                    <div>
                        <label style="font-size:13px;font-weight:600;color:var(--text2);display:block;margin-bottom:6px;">💰 Budget (₹)</label>
                        <input type="number" class="input-field" id="aiBudget" placeholder="25000" required min="1000">
                    </div>
                </div>
                <div>
                    <label style="font-size:13px;font-weight:600;color:var(--text2);display:block;margin-bottom:6px;">👥 Travellers</label>
                    <input type="number" class="input-field" id="aiTravellers" value="1" min="1">
                </div>
                <div>
                    <label style="font-size:13px;font-weight:600;color:var(--text2);display:block;margin-bottom:6px;">🎯 Interests (comma separated)</label>
                    <input type="text" class="input-field" id="aiInterests" placeholder="sightseeing, food, adventure, culture">
                </div>
                <button type="button" class="btn btn-primary" style="width:100%;justify-content:center;" id="aiGenerateBtn" onclick="generateAIPlan()">
                    <i class="fas fa-wand-magic-sparkles"></i> Generate AI Trip Plan
                </button>
            </div>
        </form>
    </div>
    
    <div id="aiLoading" style="display:none;text-align:center;padding:40px;">
        <div class="spinner"></div>
        <p style="color:var(--text2);margin-top:16px;">🤖 AI is creating your personalized trip plan...</p>
        <p style="color:var(--text3);font-size:13px;margin-top:8px;">This may take a few seconds</p>
    </div>
    
    <div id="aiResult" class="card" style="display:none;white-space:pre-wrap;font-size:14px;line-height:1.8;max-width:700px;">
    </div>
    
    <div style="max-width:700px;margin-top:16px;">
        <p style="color:var(--text2);font-size:13px;margin-bottom:8px;">💡 Quick Examples:</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="fillExample('jaipur')" class="btn btn-ghost btn-sm">Jaipur 3-Day ₹25,000</button>
            <button onclick="fillExample('goa')" class="btn btn-ghost btn-sm">Goa 5-Day ₹40,000</button>
            <button onclick="fillExample('kerala')" class="btn btn-ghost btn-sm">Kerala 4-Day ₹35,000</button>
            <button onclick="fillExample('manali')" class="btn btn-ghost btn-sm">Manali 3-Day ₹20,000</button>
        </div>
    </div>
    `;
}

// ============================================================
// AI PLAN GENERATION - MOCK MODE (FORCE)
// ============================================================

async function generateAIPlan() {
    const destination = document.getElementById('aiDestination').value.trim();
    const days = parseInt(document.getElementById('aiDays').value);
    const budget = parseInt(document.getElementById('aiBudget').value);
    const travellers = parseInt(document.getElementById('aiTravellers').value) || 1;
    const interests = document.getElementById('aiInterests').value.split(',').map(s => s.trim()).filter(Boolean);
    
    if (!destination) {
        toast('Please enter a destination', 'warning');
        return;
    }
    
    // Show loading
    document.getElementById('aiLoading').style.display = 'block';
    document.getElementById('aiResult').style.display = 'none';
    document.getElementById('aiGenerateBtn').disabled = true;
    document.getElementById('aiGenerateBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    
    try {
        // ✅ FORCE MOCK MODE - No API call, direct mock generation
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
        
        const mockPlan = generateMockPlan(destination, days, budget, travellers, interests);
        
        // Store plan data
        window._aiPlanData = { destination, days, budget, plan: mockPlan };
        
        document.getElementById('aiResult').style.display = 'block';
        document.getElementById('aiResult').innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h3 style="font-size:18px;font-weight:800;color:var(--accent);">
                    <i class="fas fa-robot"></i> AI Trip Plan: ${destination}
                </h3>
                <button onclick="copyAIPlan()" class="btn btn-ghost btn-sm">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
            <div style="background:var(--bg);padding:16px;border-radius:10px;border:1px solid var(--border);font-size:14px;line-height:1.8;white-space:pre-wrap;">
                ${mockPlan}
            </div>
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
                <button onclick="saveAIPlanToTrip()" class="btn btn-primary btn-sm">
                    <i class="fas fa-save"></i> Save as Trip
                </button>
                <button onclick="shareAIPlan()" class="btn btn-ghost btn-sm">
                    <i class="fas fa-share-alt"></i> Share
                </button>
            </div>
        `;
        
        toast('✅ AI trip plan generated!', 'success');
        
    } catch (err) {
        console.error('AI Plan Error:', err);
        toast('Failed to generate plan: ' + err.message, 'danger');
    } finally {
        document.getElementById('aiLoading').style.display = 'none';
        document.getElementById('aiGenerateBtn').disabled = false;
        document.getElementById('aiGenerateBtn').innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate AI Trip Plan';
    }
}

// ============================================================
// GENERATE MOCK PLAN (No OpenAI Required)
// ============================================================

function generateMockPlan(destination, days, budget, travellers, interests) {
    const cityData = {
        'jaipur': {
            places: ['Hawa Mahal', 'Nahargarh Fort', 'Jal Mahal', 'Amer Fort', 'City Palace', 'Jantar Mantar', 'Albert Hall Museum'],
            food: ['Pyaaz Kachori', 'Dal Baati Churma', 'Ghewar', 'Laal Maas', 'Lassi', 'Mirchi Bada'],
            tips: 'Bargain at Johari Bazaar, visit Amer Fort early morning, wear comfortable shoes'
        },
        'delhi': {
            places: ['Red Fort', 'Qutub Minar', 'India Gate', 'Lotus Temple', 'Humayun\'s Tomb', 'Chandni Chowk'],
            food: ['Chole Bhature', 'Butter Chicken', 'Jalebi', 'Chaat', 'Biryani'],
            tips: 'Use Delhi Metro for cheap travel, try street food at night'
        },
        'goa': {
            places: ['Baga Beach', 'Dudhsagar Falls', 'Basilica of Bom Jesus', 'Fort Aguada', 'Palolem Beach'],
            food: ['Fish Curry Rice', 'Bebinca', 'Prawn Balchão', 'Feni', 'Goan Sausage'],
            tips: 'Rent a scooter for ₹300-500/day, visit beaches early morning'
        },
        'mumbai': {
            places: ['Gateway of India', 'Marine Drive', 'Elephanta Caves', 'Bandra-Worli Sea Link', 'Colaba Causeway'],
            food: ['Vada Pav', 'Pav Bhaji', 'Bhel Puri', 'Pani Puri', 'Bombay Sandwich'],
            tips: 'Use local trains for cheapest travel, carry umbrella in monsoon'
        },
        'kerala': {
            places: ['Munnar Tea Gardens', 'Alleppey Backwaters', 'Periyar Wildlife Sanctuary', 'Kovalam Beach', 'Fort Kochi'],
            food: ['Appam Stew', 'Puttu Kadala', 'Karimeen Fry', 'Payasam', 'Kerala Parotta'],
            tips: 'Try houseboat stay in Alleppey, carry rain gear year-round'
        },
        'manali': {
            places: ['Rohtang Pass', 'Solang Valley', 'Hadimba Temple', 'Old Manali', 'Jogini Falls'],
            food: ['Thukpa', 'Momos', 'Sidu', 'Trout Fish', 'Chana Madra'],
            tips: 'Carry warm clothes even in summer, book Rohtang permit in advance'
        },
        'udaipur': {
            places: ['City Palace', 'Lake Pichola', 'Jag Mandir', 'Saheliyon ki Bari', 'Monsoon Palace'],
            food: ['Dal Baati Churma', 'Laal Maas', 'Gatte ki Sabzi', 'Kachori', 'Rabdi'],
            tips: 'Take sunset boat ride on Lake Pichola, visit City Palace early'
        },
        'agra': {
            places: ['Taj Mahal', 'Agra Fort', 'Mehtab Bagh', 'Fatehpur Sikri', 'Itmad-ud-Daulah Tomb'],
            food: ['Petha', 'Mughlai Cuisine', 'Bedai', 'Jalebi', 'Dalmoth'],
            tips: 'Visit Taj at sunrise, carry water bottle, avoid touts'
        },
        'varanasi': {
            places: ['Dashashwamedh Ghat', 'Kashi Vishwanath Temple', 'Sarnath', 'Assi Ghat', 'Manikarnika Ghat'],
            food: ['Kachori Sabzi', 'Thandai', 'Chaat', 'Lassi', 'Tamatar Chaat'],
            tips: 'Take boat ride at dawn for Ganga Aarti, respect local customs'
        },
        'rishikesh': {
            places: ['Laxman Jhula', 'Ram Jhula', 'Triveni Ghat', 'Neelkanth Mahadev Temple', 'Beatles Ashram'],
            food: ['Chole Bhature', 'Aloo Puri', 'Lassi', 'Italian', 'Thali'],
            tips: 'Book rafting in advance, attend Ganga Aarti at Triveni Ghat'
        }
    };
    
    // Find city data
    const cityKey = destination.toLowerCase();
    let cityInfo = cityData[cityKey];
    
    if (!cityInfo) {
        for (const [key, value] of Object.entries(cityData)) {
            if (cityKey.includes(key) || key.includes(cityKey)) {
                cityInfo = value;
                break;
            }
        }
    }
    
    if (!cityInfo) {
        cityInfo = {
            places: ['Heritage Sites', 'Local Markets', 'Temples', 'Gardens', 'Museums'],
            food: ['Local Street Food', 'Traditional Dishes', 'Sweets', 'Beverages'],
            tips: 'Ask locals for the best hidden gems, carry water bottle'
        };
    }
    
    const perDayBudget = Math.floor(budget / days);
    const places = cityInfo.places;
    const foods = cityInfo.food;
    
    let plan = `🌟 ${days}-Day Trip Plan for ${destination}\n`;
    plan += `💰 Budget: ₹${budget.toLocaleString()} | 👥 ${travellers} Traveller${travellers > 1 ? 's' : ''}\n`;
    plan += `📅 ${days} Days\n\n`;
    plan += `═`.repeat(50) + '\n\n';
    
    for (let i = 0; i < days; i++) {
        const dayNum = i + 1;
        const place1 = places[i % places.length];
        const place2 = places[(i + 1) % places.length];
        const food = foods[i % foods.length];
        const food2 = foods[(i + 1) % foods.length];
        const cost = Math.floor(perDayBudget * (0.7 + Math.random() * 0.3));
        
        plan += `📅 Day ${dayNum}: ${destination} Exploration\n`;
        plan += `🕐 7:00 AM - Morning walk & chai (₹50)\n`;
        plan += `🕐 8:30 AM - Breakfast: ${food} (₹${Math.floor(cost * 0.15)})\n`;
        plan += `🕐 10:00 AM - Visit ${place1} (Entry: ₹${Math.floor(cost * 0.25)})\n`;
        plan += `🕐 1:00 PM - Lunch: Local thali (₹${Math.floor(cost * 0.2)})\n`;
        plan += `🕐 3:00 PM - Explore ${place2} (Entry: ₹${Math.floor(cost * 0.2)})\n`;
        plan += `🕐 6:00 PM - Evening walk & shopping (₹${Math.floor(cost * 0.1)})\n`;
        plan += `🕐 8:00 PM - Dinner: ${food2} (₹${Math.floor(cost * 0.2)})\n`;
        plan += `💸 Day ${dayNum} Total: ₹${cost.toLocaleString()}\n\n`;
    }
    
    // Budget breakdown
    plan += `═`.repeat(50) + '\n\n';
    plan += `💰 Budget Breakdown for ${days} Days:\n`;
    const accommodation = Math.floor(budget * 0.3);
    const food = Math.floor(budget * 0.25);
    const transport = Math.floor(budget * 0.2);
    const activities = Math.floor(budget * 0.15);
    const shopping = budget - accommodation - food - transport - activities;
    
    plan += `🏨 Accommodation: ₹${accommodation.toLocaleString()} (30%)\n`;
    plan += `🍽️ Food: ₹${food.toLocaleString()} (25%)\n`;
    plan += `🚗 Transport: ₹${transport.toLocaleString()} (20%)\n`;
    plan += `🎯 Activities: ₹${activities.toLocaleString()} (15%)\n`;
    plan += `🛍️ Shopping: ₹${shopping.toLocaleString()} (10%)\n\n`;
    
    // Food recommendations
    plan += `═`.repeat(50) + '\n\n';
    plan += `🍽️ Must-Try Foods in ${destination}:\n`;
    foods.forEach((f, i) => {
        plan += `${i + 1}. ${f}\n`;
    });
    plan += `\n`;
    
    // Places to visit
    plan += `═`.repeat(50) + '\n\n';
    plan += `📸 Top Places to Visit:\n`;
    places.slice(0, 6).forEach((p, i) => {
        plan += `${i + 1}. ${p}\n`;
    });
    plan += `\n`;
    
    // Tips
    plan += `═`.repeat(50) + '\n\n';
    plan += `💡 Travel Tips for ${destination}:\n`;
    plan += `• ${cityInfo.tips}\n`;
    plan += `• Carry water bottle to save money\n`;
    plan += `• Book hotels in advance for best rates\n`;
    plan += `• Use public transport over cabs (save 60-70%)\n`;
    plan += `• Bargain at local markets (start at 40% of quoted price)\n`;
    plan += `• Try street food for authentic taste at low prices\n\n`;
    
    plan += `═`.repeat(50) + '\n\n';
    plan += `✅ ${destination} trip planned successfully! ✈️\n`;
    plan += `💵 Total Budget: ₹${budget.toLocaleString()}\n`;
    plan += `📅 Total Days: ${days}\n`;
    plan += `💰 Per Day: ₹${perDayBudget.toLocaleString()}\n\n`;
    plan += `📌 Pro Tip: Save 10-15% by booking everything in advance!`;
    
    return plan;
}

// ============================================================
// AI PLAN HELPERS
// ============================================================

function fillExample(city) {
    const examples = {
        jaipur: { dest: 'Jaipur', days: 3, budget: 25000, interests: 'sightseeing, food, culture' },
        goa: { dest: 'Goa', days: 5, budget: 40000, interests: 'beach, food, water sports' },
        kerala: { dest: 'Kerala', days: 4, budget: 35000, interests: 'nature, food, backwaters' },
        manali: { dest: 'Manali', days: 3, budget: 20000, interests: 'adventure, nature, trekking' }
    };
    
    const ex = examples[city];
    if (ex) {
        document.getElementById('aiDestination').value = ex.dest;
        document.getElementById('aiDays').value = ex.days;
        document.getElementById('aiBudget').value = ex.budget;
        document.getElementById('aiInterests').value = ex.interests;
        generateAIPlan();
    }
}

function copyAIPlan() {
    const resultDiv = document.getElementById('aiResult');
    const text = resultDiv.textContent;
    navigator.clipboard.writeText(text).then(() => {
        toast('📋 Plan copied to clipboard!', 'success');
    }).catch(() => {
        toast('Failed to copy', 'danger');
    });
}

async function saveAIPlanToTrip() {
    const data = window._aiPlanData;
    if (!data) {
        toast('No plan to save', 'warning');
        return;
    }
    
    const tripData = {
        destination: data.destination,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + data.days * 86400000).toISOString().split('T')[0],
        budget: data.budget,
        travellers: 1,
        travelType: 'Friends'
    };
    
    try {
        const trip = await tripsAPI.create(tripData);
        state.trips.push(trip);
        state.activeTripId = trip._id || trip.id;
        saveState();
        toast('✅ Trip created from AI plan!', 'success');
        navigate('dashboard');
    } catch (err) {
        toast('Failed to create trip: ' + err.message, 'danger');
    }
}

function shareAIPlan() {
    const data = window._aiPlanData;
    if (!data) return;
    
    const text = `🌟 AI Trip Plan: ${data.destination}\n\n${data.plan}`;
    if (navigator.share) {
        navigator.share({
            title: `Trip Plan: ${data.destination}`,
            text: text
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(text).then(() => {
            toast('📋 Plan copied to clipboard!', 'success');
        });
    }
}

// ============================================================
// MAKE GLOBALLY AVAILABLE
// ============================================================

window.downloadTripPDF = downloadTripPDF;
window.downloadExpensesPDF = downloadExpensesPDF;
window.sendBudgetAlertEmail = sendBudgetAlertEmail;
window.sendTripSummaryEmail = sendTripSummaryEmail;
window.shareTrip = shareTrip;
window.closeShareModal = closeShareModal;
window.copyShareLink = copyShareLink;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaEmail = shareViaEmail;
window.shareViaTwitter = shareViaTwitter;
window.downloadExcel = downloadExcel;
window.renderAIPlanner = renderAIPlanner;
window.generateAIPlan = generateAIPlan;
window.fillExample = fillExample;
window.copyAIPlan = copyAIPlan;
window.saveAIPlanToTrip = saveAIPlanToTrip;
window.shareAIPlan = shareAIPlan;

console.log('✅ All Functions Loaded: PDF, Email, Share, Excel, AI Planner!');