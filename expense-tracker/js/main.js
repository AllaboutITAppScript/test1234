let currentMonth = new Date().getMonth()+1, currentYear = new Date().getFullYear(), chart=null;
async function loadAllData() {
    showLoading();
    let [expenses, summary, categories] = await Promise.all([getExpenses(currentMonth,currentYear), getMonthlySummary(currentMonth,currentYear), getCategorySummary(currentMonth,currentYear)]);
    renderTransactions(expenses);
    document.getElementById("totalIncome").innerHTML = `฿${(summary.income?.THB||0).toFixed(2)}`;
    document.getElementById("totalExpense").innerHTML = `฿${(summary.expense?.THB||0).toFixed(2)}`;
    document.getElementById("netBalance").innerHTML = `฿${(summary.net?.THB||0).toFixed(2)}`;
    if(chart) chart.destroy();
    chart = new Chart(document.getElementById("categoryChart"), {type:"doughnut", data:{labels:categories.labels||[], datasets:[{data:categories.data||[], backgroundColor:["#3b82f6","#f97316","#10b981","#ef4444","#a855f7"]}]}});
    hideLoading();
}
async function addTransactionHandler() {
    let payload = {expense_date:document.getElementById("expenseDate").value, type:document.getElementById("transactionType").value, amount:parseFloat(document.getElementById("amount").value), category:document.getElementById("category").value, description:document.getElementById("description").value||"-", currency:"THB"};
    if(!payload.expense_date || isNaN(payload.amount) || payload.amount<=0) { Swal.fire("กรุากรอกข้อมล","","warning"); return; }
    showLoading();
    await addExpense(payload);
    Swal.fire("บันทึกสำเรจ","","success");
    document.getElementById("amount").value = "";
    document.getElementById("description").value = "";
    await loadAllData();
    hideLoading();
}
window.deleteTransactionHandler = async (id) => {
    let c = await Swal.fire({title:"ลบรายการ?", showCancelButton:true, confirmButtonText:"ลบ"});
    if(c.isConfirmed) { showLoading(); await deleteExpense(id); await loadAllData(); Swal.fire("ลบแล้ว","","success"); hideLoading(); }
};
document.getElementById("refreshBtn").onclick = loadAllData;
document.getElementById("addExpenseBtn").onclick = addTransactionHandler;
document.getElementById("setupDbBtn").onclick = async () => { showLoading(); await setupDatabase(); Swal.fire("Setup สำเรจ","","success"); await loadAllData(); hideLoading(); };
function initSelects() {
    for(let i=1;i<=12;i++) document.getElementById("monthSelect").innerHTML += `<option value="${i}">${i}</option>`;
    document.getElementById("monthSelect").value = currentMonth;
    document.getElementById("monthSelect").onchange = (e) => { currentMonth = parseInt(e.target.value); loadAllData(); };
    for(let y=2023;y<=2028;y++) document.getElementById("yearSelect").innerHTML += `<option value="${y}">${y}</option>`;
    document.getElementById("yearSelect").value = currentYear;
    document.getElementById("yearSelect").onchange = (e) => { currentYear = parseInt(e.target.value); loadAllData(); };
    document.getElementById("expenseDate").value = new Date().toISOString().slice(0,10);
}
initSelects();
loadAllData();
