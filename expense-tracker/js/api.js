const getApiBase = () => {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return "http://localhost:3000";
    return window.location.origin;
};
const API_BASE = getApiBase();
console.log("API_BASE:", API_BASE);

async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE}/api${endpoint}`;
    const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}
async function getExpenses(m,y,c="") { let url = `/expenses?month=${m}&year=${y}`; if(c) url+=`&currency=${c}`; return apiCall(url); }
async function addExpense(p) { return apiCall("/expenses", { method:"POST", body:JSON.stringify(p) }); }
async function deleteExpense(id) { return apiCall(`/expenses/${id}`, { method:"DELETE" }); }
async function getMonthlySummary(m,y) { return apiCall(`/summary/monthly?month=${m}&year=${y}`); }
async function getCategorySummary(m,y,c="") { let url = `/categories?month=${m}&year=${y}`; if(c) url+=`&currency=${c}`; return apiCall(url); }
async function setupDatabase() { return apiCall("/setup", { method:"POST" }); }
async function exportToCSV(m,y) { return apiCall(`/export/csv?month=${m}&year=${y}`); }
async function getBudgets(m,y) { return apiCall(`/budgets?month=${m}&year=${y}`); }
async function setBudgets(m,y,b) { return apiCall("/budgets", { method:"POST", body:JSON.stringify({ month:m, year:y, budgets:b }) }); }
