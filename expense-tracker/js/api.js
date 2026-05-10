// API - เชื่อมต่อกับ PostgreSQL บน Neon.tech
const API_BASE = window.location.origin;

async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE}/api${endpoint}`;
    console.log('Calling:', url);
    
    const res = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function getExpenses(month, year) { 
    return apiCall(`/expenses?month=${month}&year=${year}`); 
}

async function addExpense(payload) { 
    return apiCall('/expenses', { method: 'POST', body: JSON.stringify(payload) }); 
}

async function deleteExpense(id) { 
    return apiCall(`/expenses/${id}`, { method: 'DELETE' }); 
}

async function getMonthlySummary(month, year) { 
    return apiCall(`/summary/monthly?month=${month}&year=${year}`); 
}

async function getCategorySummary(month, year) { 
    return apiCall(`/categories?month=${month}&year=${year}`); 
}

async function setupDatabase() { 
    return apiCall('/setup', { method: 'POST' }); 
}

async function exportToCSV(month, year) { 
    return apiCall(`/export/csv?month=${month}&year=${year}`); 
}

async function getBudgets() { return { THB: 10000 }; }
async function setBudgets() { return {}; }
async function lineAuth(uid, name) { return { success: true }; }
