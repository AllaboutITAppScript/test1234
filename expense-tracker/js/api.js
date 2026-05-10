const API_BASE = "http://localhost:3000";
async function apiCall(endpoint, options={}) {
    let res = await fetch(API_BASE+"/api"+endpoint, {...options, headers:{"Content-Type":"application/json"}});
    if(!res.ok) throw new Error(await res.text());
    return res.json();
}
async function getExpenses(m,y) { return apiCall(`/expenses?month=${m}&year=${y}`); }
async function addExpense(p) { return apiCall("/expenses", {method:"POST", body:JSON.stringify(p)}); }
async function deleteExpense(id) { return apiCall(`/expenses/${id}`, {method:"DELETE"}); }
async function getMonthlySummary(m,y) { return apiCall(`/summary/monthly?month=${m}&year=${y}`); }
async function getCategorySummary(m,y) { return apiCall(`/categories?month=${m}&year=${y}`); }
async function setupDatabase() { return apiCall("/setup", {method:"POST"}); }
async function exportToCSV(m,y) { return apiCall(`/export/csv?month=${m}&year=${y}`); }
async function getBudgets() { return {THB:10000}; }
async function setBudgets() { return {}; }
async function lineAuth(u,n) { return {success:true}; }
