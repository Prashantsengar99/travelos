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
            <button onclick="sendBudgetAlertEmail()" class="btn btn-sm btn-ghost" title="Send Budget Alert Email">
                <i class="fas fa-envelope"></i> Alert
            </button>
            <button onclick="sendTripSummaryEmail()" class="btn btn-sm btn-ghost" title="Send Trip Summary Email">
                <i class="fas fa-file-export"></i> Summary
            </button>
            <button onclick="downloadTripPDF()" class="btn btn-sm btn-ghost" title="Download Trip Summary PDF">
                <i class="fas fa-file-pdf"></i> PDF
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
            <div style="display:flex;gap:8px;">
                <button onclick="downloadTripPDF()" class="btn btn-primary">
                    <i class="fas fa-file-pdf"></i> Trip Summary
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

// ✅ Make globally available for onclick
window.downloadTripPDF = downloadTripPDF;
window.downloadExpensesPDF = downloadExpensesPDF;
window.sendBudgetAlertEmail = sendBudgetAlertEmail;
window.sendTripSummaryEmail = sendTripSummaryEmail;

console.log('✅ PDF & Email Functions Loaded!');