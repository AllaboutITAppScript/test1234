const API_BASE = window.location.origin;

async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api${endpoint}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers }
    });
    if (res.status === 401 && window.liff) { liff.login(); return null; }
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function getExpenses(month, year) { return apiCall(`/expenses?month=${month}&year=${year}`); }
async function addExpense(payload) { return apiCall('/expenses', { method: 'POST', body: JSON.stringify(payload) }); }
async function deleteExpense(id) { return apiCall(`/expenses/${id}`, { method: 'DELETE' }); }
async function getMonthlySummary(month, year) { return apiCall(`/summary/monthly?month=${month}&year=${year}`); }
async function getCategorySummary(month, year, currency = '') { return apiCall(`/categories?month=${month}&year=${year}` + (currency ? `&currency=${currency}` : '')); }
async function getBudgets(month, year) { return apiCall(`/budgets?month=${month}&year=${year}`); }
async function setBudgets(month, year, budgets) { return apiCall('/budgets', { method: 'POST', body: JSON.stringify({ month, year, budgets }) }); }
async function setupDatabase() { return apiCall('/setup', { method: 'POST' }); }
async function exportToCSV(month, year) { return apiCall(`/export/csv?month=${month}&year=${year}`); }
async function lineAuth(lineUid, displayName, email = '') {
    const res = await fetch(`${API_BASE}/api/auth/liff`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lineUid, displayName, email }) });
    return res.json();
}