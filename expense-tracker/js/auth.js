// js/api.js
// สลับระหว่าง Local และ Production อัตโนมัติ
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocal ? 'http://localhost:3000' : window.location.origin;

console.log('API_BASE:', API_BASE);
console.log('Environment:', isLocal ? 'Local' : 'Production');

async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const url = `${API_BASE}/api${endpoint}`;
    console.log('Calling:', url);

    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });

        if (res.status === 401) {
            console.warn('Unauthorized - need login');
            if (typeof liff !== 'undefined' && liff.isLoggedIn) {
                if (liff.isLoggedIn()) liff.login();
            }
            return null;
        }

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `HTTP ${res.status}`);
        }

        return res.json();
    } catch (err) {
        console.error('API Error:', err);
        throw err;
    }
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
    const url = `${API_BASE}/api/auth/liff`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUid, displayName, email })
    });
    return res.json();
}