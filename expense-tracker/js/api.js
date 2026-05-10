// API - Auto Detect (ทำงานทั้ง Localhost และ Vercel)
const getApiBase = () => {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return "http://localhost:3000";
    }
    return window.location.origin;
};

const API_BASE = getApiBase();
console.log("API_BASE:", API_BASE);

async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE}/api${endpoint}`;
    console.log("Calling:", url);
    const res = await fetch(url, {
        ...options,
        headers: { "Content-Type": "application/json", ...options.headers }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function getExpenses(month, year, currency = "") {
    let url = `/expenses?month=${month}&year=${year}`;
    if (currency) url += `&currency=${currency}`;
    return apiCall(url);
}
async function addExpense(payload) { return apiCall("/expenses", { method: "POST", body: JSON.stringify(payload) }); }
async function deleteExpense(id) { return apiCall(`/expenses/${id}`, { method: "DELETE" }); }
async function getMonthlySummary(month, year) { return apiCall(`/summary/monthly?month=${month}&year=${year}`); }
async function getCategorySummary(month, year, currency = "") { 
    let url = `/categories?month=${month}&year=${year}`;
    if (currency) url += `&currency=${currency}`;
    return apiCall(url); 
}
async function setupDatabase() { return apiCall("/setup", { method: "POST" }); }
async function exportToCSV(month, year) { return apiCall(`/export/csv?month=${month}&year=${year}`); }
async function getBudgets(month, year) { return apiCall(`/budgets?month=${month}&year=${year}`); }
async function setBudgets(month, year, budgets) { return apiCall("/budgets", { method: "POST", body: JSON.stringify({ month, year, budgets }) }); }
async function lineAuth(uid, name) { return { success: true }; }
