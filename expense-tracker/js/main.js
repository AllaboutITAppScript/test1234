let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();

async function loadAllData() {
    showLoading();
    try {
        const [expenses, summary, categories] = await Promise.all([
            getExpenses(currentMonth, currentYear),
            getMonthlySummary(currentMonth, currentYear),
            getCategorySummary(currentMonth, currentYear, document.getElementById('currencyFilter')?.value || '')
        ]);
        renderTransactions(expenses);
        renderSummary(summary, currentMonth, currentYear);
        renderChart(categories);
        if (summary?.expense) await checkBudgetAlert(summary.expense);
    } catch (err) { console.error(err); showAlert('error', 'โหลดข้อมูลล้มเหลว', err.message); }
    hideLoading();
}

async function addTransactionHandler() {
    const payload = {
        expense_date: document.getElementById('expenseDate').value,
        type: document.getElementById('transactionType').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        currency: document.getElementById('currency').value,
        description: document.getElementById('description').value.trim() || '-'
    };
    if (!payload.expense_date) return showAlert('warning', 'กรุณาเลือกวันที่');
    if (isNaN(payload.amount) || payload.amount <= 0) return showAlert('warning', 'กรุณากรอกจำนวนเงิน');
    showLoading();
    try {
        await addExpense(payload);
        showAlert('success', 'บันทึกสำเร็จ!');
        document.getElementById('amount').value = '';
        document.getElementById('description').value = '';
        await loadAllData();
    } catch (err) { showAlert('error', 'บันทึกไม่สำเร็จ', err.message); }
    hideLoading();
}

window.deleteTransactionHandler = async (id) => {
    const confirm = await Swal.fire({ title: 'ยืนยันการลบ', text: 'คุณต้องการลบรายการนี้ใช่หรือไม่?', icon: 'question', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก' });
    if (confirm.isConfirmed) {
        showLoading();
        try { await deleteExpense(id); showAlert('success', 'ลบรายการสำเร็จ'); await loadAllData(); }
        catch (err) { showAlert('error', 'ลบไม่สำเร็จ', err.message); }
        hideLoading();
    }
};

async function setupDatabaseHandler() {
    showLoading();
    try { const res = await setupDatabase(); showAlert('success', 'Setup ฐานข้อมูลสำเร็จ'); }
    catch (err) { showAlert('error', 'Setup ไม่สำเร็จ', err.message); }
    hideLoading();
}

async function exportCSVHandler() {
    showLoading();
    try {
        const data = await exportToCSV(currentMonth, currentYear);
        if (!data?.length) { showAlert('info', 'ไม่มีข้อมูล'); hideLoading(); return; }
        const headers = ['วันที่', 'ประเภท', 'จำนวน', 'สกุลเงิน', 'หมวดหมู่', 'รายละเอียด'];
        const rows = data.map(r => [r.expense_date, r.type, r.amount, r.currency, r.category, r.description]);
        const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `expenses_${currentYear}_${currentMonth}.csv`;
        link.click();
        URL.revokeObjectURL(link);
        showAlert('success', 'ส่งออก CSV สำเร็จ');
    } catch (err) { showAlert('error', 'ส่งออกไม่สำเร็จ', err.message); }
    hideLoading();
}

async function checkBudgetAlert(expense) {
    if (!expense) return;
    try {
        const budgets = await getBudgets(currentMonth, currentYear);
        let alertMsg = '';
        for (const [curr, amt] of Object.entries(expense)) {
            if (budgets[curr] && amt > budgets[curr]) alertMsg += `${curr}: ${formatCurrency(amt)} / ${formatCurrency(budgets[curr])} | `;
        }
        if (alertMsg) showAlert('warning', '⚠️ แจ้งเตือนงบประมาณ', alertMsg);
    } catch (err) { console.error(err); }
}

document.addEventListener('DOMContentLoaded', () => {
    initMonthYearSelects();
    document.getElementById('expenseDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('refreshBtn')?.addEventListener('click', loadAllData);
    document.getElementById('addExpenseBtn')?.addEventListener('click', addTransactionHandler);
    document.getElementById('setupDbBtn')?.addEventListener('click', setupDatabaseHandler);
    document.getElementById('exportBtn')?.addEventListener('click', exportCSVHandler);
    document.getElementById('monthSelect')?.addEventListener('change', (e) => { currentMonth = parseInt(e.target.value); loadAllData(); });
    document.getElementById('yearSelect')?.addEventListener('change', (e) => { currentYear = parseInt(e.target.value); loadAllData(); });
    document.getElementById('currencyFilter')?.addEventListener('change', () => loadAllData());
    initLiff();
});