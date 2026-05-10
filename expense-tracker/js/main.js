let currentPage = "home", currentMonth = new Date().getMonth()+1, currentYear = new Date().getFullYear(), transactionType = "expense", chart1 = null, chart2 = null;
document.querySelectorAll(".nav-item").forEach(item => { item.addEventListener("click", () => switchPage(item.dataset.page)); });
document.getElementById("viewAllBtn")?.addEventListener("click", () => switchPage("transactions"));
document.getElementById("fabAddBtn")?.addEventListener("click", () => switchPage("add"));
document.getElementById("darkModeToggle")?.addEventListener("click", () => { document.body.classList.toggle("dark"); toggleDarkMode(); });

function switchPage(page) {
    currentPage = page;
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(`page-${page}`).classList.add("active");
    document.querySelectorAll(".nav-item").forEach(item => {
        if(item.dataset.page === page) item.classList.add("active");
        else item.classList.remove("active");
    });
    if(page === "home") loadHome();
    if(page === "transactions") loadTransactions();
    if(page === "reports") loadReports();
    if(page === "budget") loadBudgetPage();
}

document.getElementById("typeExpenseBtn")?.addEventListener("click", () => { transactionType = "expense"; document.getElementById("typeExpenseBtn").style.background="#7f1d1d"; document.getElementById("typeIncomeBtn").style.background=""; });
document.getElementById("typeIncomeBtn")?.addEventListener("click", () => { transactionType = "income"; document.getElementById("typeIncomeBtn").style.background="#064e3b"; document.getElementById("typeExpenseBtn").style.background=""; });
document.getElementById("saveTransactionBtn")?.addEventListener("click", async () => {
    let payload = { expense_date:document.getElementById("expenseDate").value, type:transactionType, amount:parseFloat(document.getElementById("amount").value), category:document.getElementById("category").value, description:document.getElementById("description").value||"-", currency:document.getElementById("currency").value };
    if(!payload.expense_date || isNaN(payload.amount) || payload.amount<=0) { Swal.fire("กรุากรอกข้อมล","","warning"); return; }
    showLoading();
    try { await addExpense(payload); Swal.fire("บันทึกสำเรจ!","","success"); document.getElementById("amount").value=""; document.getElementById("description").value=""; switchPage("home"); loadHome(); } catch(e) { Swal.fire("Error",e.message,"error"); }
    hideLoading();
});
async function loadHome() {
    showLoading();
    let [expenses, summary, cats] = await Promise.all([getExpenses(currentMonth,currentYear), getMonthlySummary(currentMonth,currentYear), getCategorySummary(currentMonth,currentYear)]);
    let recent = expenses.slice(0,5);
    document.getElementById("recentTransactions").innerHTML = !recent.length ? '<div class="text-center text-slate-400 py-4">ไม่มีรายการ</div>' : recent.map(t => {
        let amountNum = parseFloat(t.amount);
        let amountDisplay = isNaN(amountNum) ? 0 : amountNum;
        return `<div class="transaction-item flex justify-between items-center"><div><div class="text-white font-medium">${t.category}</div><div class="text-slate-400 text-xs">${t.expense_date}</div></div><div class="text-right"><div class="${t.type==="income"?"amount-income":"amount-expense"} font-semibold">${t.type==="income"?"+":"-"} ${amountDisplay.toFixed(2)} ${t.currency}</div><div class="text-slate-400 text-xs">${t.description||"-"}</div></div></div>`;
    }).join("");
    document.getElementById("totalIncome").innerHTML = `฿${(summary.income?.THB||0).toFixed(2)}`;
    document.getElementById("totalExpense").innerHTML = `฿${(summary.expense?.THB||0).toFixed(2)}`;
    document.getElementById("netBalance").innerHTML = `฿${(summary.net?.THB||0).toFixed(2)}`;
    if(chart1) chart1.destroy();
    chart1 = new Chart(document.getElementById("categoryChart"), { type:"doughnut", data:{ labels:cats.labels||[], datasets:[{ data:cats.data||[], backgroundColor:["#818cf8","#f97316","#34d399","#f87171","#a855f7","#ec489a"] }] }, options:{ responsive:true, plugins:{ legend:{ position:"bottom", labels:{ color:"#94a3b8" } } } } });
    hideLoading();
}
async function loadTransactions() {
    showLoading();
    let expenses = await getExpenses(currentMonth,currentYear);
    document.getElementById("allTransactionsList").innerHTML = !expenses.length ? '<div class="text-center text-slate-400 py-4">ไม่มีรายการ</div>' : expenses.map(t => {
        let amountNum = parseFloat(t.amount);
        let amountDisplay = isNaN(amountNum) ? 0 : amountNum;
        return `<div class="transaction-item flex justify-between items-center"><div><div class="text-white font-medium">${t.category}</div><div class="text-slate-400 text-xs">${t.expense_date}</div></div><div class="text-right"><div class="${t.type==="income"?"amount-income":"amount-expense"} font-semibold">${t.type==="income"?"+":"-"} ${amountDisplay.toFixed(2)} ${t.currency}</div><div class="text-slate-400 text-xs">${t.description||"-"}</div></div><button onclick="deleteTrans(${t.id})" class="text-red-400 ml-2"><i class="fas fa-trash-alt"></i></button></div>`;
    }).join("");
    hideLoading();
}
window.deleteTrans = async (id) => {
    let c = await Swal.fire({ title:"ลบรายการ?", showCancelButton:true, confirmButtonText:"ลบ" });
    if(c.isConfirmed) { showLoading(); await deleteExpense(id); loadTransactions(); loadHome(); hideLoading(); Swal.fire("ลบแล้ว","","success"); }
};
async function loadReports() {
    showLoading();
    let summary = await getMonthlySummary(currentMonth,currentYear);
    if(chart2) chart2.destroy();
    chart2 = new Chart(document.getElementById("trendChart"), { type:"bar", data:{ labels:["รายรับ","รายจ่าย","คงเหลือ"], datasets:[{ label:"บาท", data:[summary.income?.THB||0, summary.expense?.THB||0, summary.net?.THB||0], backgroundColor:["#34d399","#f87171","#818cf8"] }] }, options:{ responsive:true, plugins:{ legend:{ labels:{ color:"#94a3b8" } } } } });
    let cats = await getCategorySummary(currentMonth,currentYear);
    let sorted = cats.labels?.map((l,i)=>(({label:l,value:cats.data[i]}))).sort((a,b)=>b.value-a.value).slice(0,5) || [];
    document.getElementById("topCategories").innerHTML = !sorted.length ? '<div class="text-center text-slate-400">ไม่มีข้อมล</div>' : sorted.map(c => `<div class="flex justify-between items-center py-2 border-b border-slate-700"><span class="text-white">${c.label}</span><span class="text-indigo-400 font-semibold">${c.value.toFixed(2)} บาท</span></div>`).join("");
    hideLoading();
}
async function loadBudgetPage() {
    showLoading();
    let budgets = await getBudgets(currentMonth,currentYear);
    document.getElementById("budgetThb").value = budgets.THB||"";
    document.getElementById("budgetUsd").value = budgets.USD||"";
    document.getElementById("budgetEur").value = budgets.EUR||"";
    let summary = await getMonthlySummary(currentMonth,currentYear);
    let expense = summary.expense?.THB||0, budget = budgets.THB||0;
    let alertDiv = document.getElementById("budgetAlert");
    if(budget>0 && expense>budget) { alertDiv.classList.remove("hidden"); alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i> เกินงบประมา! ใช้ไป ${expense.toFixed(2)} / ${budget.toFixed(2)} บาท`; }
    else alertDiv.classList.add("hidden");
    hideLoading();
}
document.getElementById("saveBudgetBtn")?.addEventListener("click", async () => {
    let budgets = { THB:parseFloat(document.getElementById("budgetThb").value)||0, USD:parseFloat(document.getElementById("budgetUsd").value)||0, EUR:parseFloat(document.getElementById("budgetEur").value)||0 };
    showLoading();
    try { await setBudgets(currentMonth,currentYear,budgets); Swal.fire("บันทึกงบประมาแล้ว","","success"); loadBudgetPage(); } catch(e) { Swal.fire("Error",e.message,"error"); }
    hideLoading();
});
document.getElementById("filterBtn")?.addEventListener("click", () => loadTransactions());
function initSelects() {
    for(let i=1;i<=12;i++) { document.getElementById("monthSelect")?.insertAdjacentHTML("beforeend", `<option value="${i}">${i}</option>`); document.getElementById("reportMonth")?.insertAdjacentHTML("beforeend", `<option value="${i}">${i}</option>`); }
    document.getElementById("monthSelect").value = currentMonth;
    document.getElementById("reportMonth").value = currentMonth;
    document.getElementById("monthSelect")?.addEventListener("change", (e) => { currentMonth = parseInt(e.target.value); loadTransactions(); });
    document.getElementById("reportMonth")?.addEventListener("change", (e) => { currentMonth = parseInt(e.target.value); loadReports(); });
    for(let y=2023;y<=2028;y++) document.getElementById("yearSelect")?.insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`);
    document.getElementById("yearSelect").value = currentYear;
    document.getElementById("yearSelect")?.addEventListener("change", (e) => { currentYear = parseInt(e.target.value); loadTransactions(); });
    document.getElementById("expenseDate").value = new Date().toISOString().slice(0,10);
}
initSelects();
loadHome();
document.getElementById("chartCurrency")?.addEventListener("change", async () => {
    let currency = document.getElementById("chartCurrency").value;
    let cats = await getCategorySummary(currentMonth,currentYear,currency);
    if(chart1) chart1.destroy();
    chart1 = new Chart(document.getElementById("categoryChart"), { type:"doughnut", data:{ labels:cats.labels||[], datasets:[{ data:cats.data||[], backgroundColor:["#818cf8","#f97316","#34d399","#f87171","#a855f7","#ec489a"] }] }, options:{ responsive:true, plugins:{ legend:{ position:"bottom", labels:{ color:"#94a3b8" } } } } });
});
