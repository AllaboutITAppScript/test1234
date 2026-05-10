let currentPage = "home";
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();
let transactionType = "expense";
let chart1 = null, chart2 = null;

// Navigation
document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
        let page = item.dataset.page;
        switchPage(page);
    });
});
document.getElementById("viewAllBtn")?.addEventListener("click", () => switchPage("transactions"));
document.getElementById("fabAddBtn")?.addEventListener("click", () => switchPage("add"));

function switchPage(page) {
    currentPage = page;
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(`page-${page}`).classList.add("active");
    document.querySelectorAll(".nav-item").forEach(item => {
        let icon = item.querySelector("i");
        let text = item.querySelector("span");
        if (item.dataset.page === page) {
            icon.style.color = "#667eea";
            text.style.color = "#667eea";
            text.style.fontWeight = "600";
        } else {
            icon.style.color = "#94a3b8";
            text.style.color = "#94a3b8";
            text.style.fontWeight = "500";
        }
    });
    if (page === "home") loadHome();
    if (page === "transactions") loadTransactions();
    if (page === "reports") loadReports();
    if (page === "budget") loadBudgetPage();
}

// Type selection
document.getElementById("typeExpenseBtn")?.addEventListener("click", () => {
    transactionType = "expense";
    document.getElementById("typeExpenseBtn").style.background = "#fff1f0";
    document.getElementById("typeExpenseBtn").style.borderColor = "#fecaca";
    document.getElementById("typeIncomeBtn").style.background = "#f0fdf4";
    document.getElementById("typeIncomeBtn").style.borderColor = "#e2e8f0";
});
document.getElementById("typeIncomeBtn")?.addEventListener("click", () => {
    transactionType = "income";
    document.getElementById("typeIncomeBtn").style.background = "#d1fae5";
    document.getElementById("typeIncomeBtn").style.borderColor = "#a7f3d0";
    document.getElementById("typeExpenseBtn").style.background = "#fef2f2";
    document.getElementById("typeExpenseBtn").style.borderColor = "#e2e8f0";
});

// Save transaction
document.getElementById("saveTransactionBtn")?.addEventListener("click", async () => {
    let payload = {
        expense_date: document.getElementById("expenseDate").value,
        type: transactionType,
        amount: parseFloat(document.getElementById("amount").value),
        category: document.getElementById("category").value,
        description: document.getElementById("description").value || "-",
        currency: document.getElementById("currency").value
    };
    if (!payload.expense_date || isNaN(payload.amount) || payload.amount <= 0) {
        Swal.fire("กรุากรอกข้อมล", "", "warning");
        return;
    }
    showLoading();
    try {
        await addExpense(payload);
        Swal.fire("บันทึกสำเรจ!", "", "success");
        document.getElementById("amount").value = "";
        document.getElementById("description").value = "";
        switchPage("home");
        loadHome();
    } catch(e) { Swal.fire("Error", e.message, "error"); }
    hideLoading();
});

// Load Home
async function loadHome() {
    showLoading();
    try {
        let [expenses, summary] = await Promise.all([
            getExpenses(currentMonth, currentYear),
            getMonthlySummary(currentMonth, currentYear)
        ]);
        let recent = expenses.slice(0, 5);
        let container = document.getElementById("recentTransactions");
        if (!recent.length) container.innerHTML = '<div class="text-center text-slate-400 py-4">ไม่มีรายการ</div>';
        else {
            container.innerHTML = recent.map(t => `
                <div class="transaction-item flex justify-between items-center">
                    <div><div class="text-sm font-medium">${t.category}</div><div class="text-xs text-slate-400">${t.expense_date}</div></div>
                    <div class="text-right"><div class="${t.type === "income" ? "amount-income" : "amount-expense"} font-semibold">${t.type === "income" ? "+" : "-"} ${Number(t.amount).toFixed(2)} ${t.currency}</div><div class="text-xs text-slate-400">${t.description || "-"}</div></div>
                </div>
            `).join("");
        }
        document.getElementById("totalIncome").innerHTML = `฿${(summary.income?.THB || 0).toFixed(2)}`;
        document.getElementById("totalExpense").innerHTML = `฿${(summary.expense?.THB || 0).toFixed(2)}`;
        document.getElementById("netBalance").innerHTML = `฿${(summary.net?.THB || 0).toFixed(2)}`;
        
        let cats = await getCategorySummary(currentMonth, currentYear);
        if (chart1) chart1.destroy();
        let ctx = document.getElementById("categoryChart").getContext("2d");
        chart1 = new Chart(ctx, {
            type: "doughnut",
            data: { labels: cats.labels || [], datasets: [{ data: cats.data || [], backgroundColor: ["#3b82f6","#f97316","#10b981","#ef4444","#a855f7","#ec489a"] }] },
            options: { responsive: true, plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } } }
        });
    } catch(e) { console.error(e); }
    hideLoading();
}

// Load Transactions
async function loadTransactions() {
    showLoading();
    try {
        let expenses = await getExpenses(currentMonth, currentYear);
        let container = document.getElementById("allTransactionsList");
        if (!expenses.length) container.innerHTML = '<div class="text-center text-slate-400 py-4">ไม่มีรายการ</div>';
        else {
            container.innerHTML = expenses.map(t => `
                <div class="transaction-item flex justify-between items-center">
                    <div><div class="text-sm font-medium">${t.category}</div><div class="text-xs text-slate-400">${t.expense_date}</div></div>
                    <div class="text-right"><div class="${t.type === "income" ? "amount-income" : "amount-expense"} font-semibold">${t.type === "income" ? "+" : "-"} ${Number(t.amount).toFixed(2)} ${t.currency}</div><div class="text-xs text-slate-400">${t.description || "-"}</div></div>
                    <button onclick="deleteTrans(${t.id})" class="text-red-400 ml-2"><i class="fas fa-trash-alt"></i></button>
                </div>
            `).join("");
        }
    } catch(e) { console.error(e); }
    hideLoading();
}

window.deleteTrans = async (id) => {
    let c = await Swal.fire({ title: "ลบรายการ?", showCancelButton: true, confirmButtonText: "ลบ" });
    if (c.isConfirmed) { showLoading(); await deleteExpense(id); loadTransactions(); loadHome(); hideLoading(); Swal.fire("ลบแล้ว", "", "success"); }
};

// Load Reports
async function loadReports() {
    showLoading();
    try {
        let summary = await getMonthlySummary(currentMonth, currentYear);
        if (chart2) chart2.destroy();
        let ctx = document.getElementById("trendChart").getContext("2d");
        chart2 = new Chart(ctx, {
            type: "bar",
            data: { labels: ["รายรับ", "รายจ่าย", "คงเหลือ"], datasets: [{ label: "บาท", data: [summary.income?.THB || 0, summary.expense?.THB || 0, summary.net?.THB || 0], backgroundColor: ["#10b981", "#ef4444", "#667eea"] }] },
            options: { responsive: true }
        });
        let cats = await getCategorySummary(currentMonth, currentYear);
        let topDiv = document.getElementById("topCategories");
        if (!cats.labels?.length) topDiv.innerHTML = '<div class="text-center text-slate-400">ไม่มีข้อมล</div>';
        else {
            let sorted = cats.labels.map((l,i) => ({ label: l, value: cats.data[i] })).sort((a,b) => b.value - a.value).slice(0,5);
            topDiv.innerHTML = sorted.map(c => `<div class="flex justify-between items-center py-2 border-b"><span>${c.label}</span><span class="font-semibold">${c.value.toFixed(2)} บาท</span></div>`).join("");
        }
    } catch(e) { console.error(e); }
    hideLoading();
}

// Budget
async function loadBudgetPage() {
    showLoading();
    try {
        let budgets = await getBudgets();
        document.getElementById("budgetThb").value = budgets.THB || "";
        document.getElementById("budgetUsd").value = budgets.USD || "";
        document.getElementById("budgetEur").value = budgets.EUR || "";
        let summary = await getMonthlySummary(currentMonth, currentYear);
        let expenseTHB = summary.expense?.THB || 0;
        let budgetTHB = budgets.THB || 0;
        let alertDiv = document.getElementById("budgetAlert");
        if (budgetTHB > 0 && expenseTHB > budgetTHB) {
            alertDiv.classList.remove("hidden");
            alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i> เกินงบประมา! ใช้ไป ${expenseTHB.toFixed(2)} / ${budgetTHB.toFixed(2)} บาท`;
        } else alertDiv.classList.add("hidden");
    } catch(e) { console.error(e); }
    hideLoading();
}
document.getElementById("saveBudgetBtn")?.addEventListener("click", async () => {
    let budgets = {
        THB: parseFloat(document.getElementById("budgetThb").value) || 0,
        USD: parseFloat(document.getElementById("budgetUsd").value) || 0,
        EUR: parseFloat(document.getElementById("budgetEur").value) || 0
    };
    showLoading();
    try { await setBudgets(currentMonth, currentYear, budgets); Swal.fire("บันทึกงบประมาแล้ว", "", "success"); loadBudgetPage(); } catch(e) { Swal.fire("Error", e.message, "error"); }
    hideLoading();
});

// Filter
document.getElementById("filterBtn")?.addEventListener("click", () => loadTransactions());

// Init selects
function initSelects() {
    for (let i=1;i<=12;i++) {
        document.getElementById("monthSelect")?.insertAdjacentHTML("beforeend", `<option value="${i}">${i}</option>`);
        document.getElementById("reportMonth")?.insertAdjacentHTML("beforeend", `<option value="${i}">${i}</option>`);
    }
    document.getElementById("monthSelect").value = currentMonth;
    document.getElementById("reportMonth").value = currentMonth;
    document.getElementById("monthSelect")?.addEventListener("change", (e) => { currentMonth = parseInt(e.target.value); loadTransactions(); });
    document.getElementById("reportMonth")?.addEventListener("change", (e) => { currentMonth = parseInt(e.target.value); loadReports(); });
    for (let y=2023;y<=2028;y++) {
        document.getElementById("yearSelect")?.insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`);
    }
    document.getElementById("yearSelect").value = currentYear;
    document.getElementById("yearSelect")?.addEventListener("change", (e) => { currentYear = parseInt(e.target.value); loadTransactions(); });
    document.getElementById("expenseDate").value = new Date().toISOString().slice(0,10);
    document.getElementById("userName").innerText = "ผ้ใช้";
}
initSelects();
loadHome();

// Add chart currency filter
document.getElementById("chartCurrency")?.addEventListener("change", async () => {
    let currency = document.getElementById("chartCurrency").value;
    let cats = await getCategorySummary(currentMonth, currentYear, currency);
    if (chart1) chart1.destroy();
    let ctx = document.getElementById("categoryChart").getContext("2d");
    chart1 = new Chart(ctx, {
        type: "doughnut",
        data: { labels: cats.labels || [], datasets: [{ data: cats.data || [], backgroundColor: ["#3b82f6","#f97316","#10b981","#ef4444","#a855f7","#ec489a"] }] },
        options: { responsive: true, plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } } }
    });
});
