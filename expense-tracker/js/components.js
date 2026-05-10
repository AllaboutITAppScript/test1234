function renderTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    if (!container) return;
    if (!transactions?.length) { container.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400">ไม่มีรายการ</td></tr>'; return; }
    container.innerHTML = transactions.slice(0, 10).map(t => {
        const isIncome = t.type === 'income';
        return `<tr class="transaction-item"><td class="px-4 py-3 text-sm">${formatThaiDate(t.expense_date)}</td>
                <td class="px-4 py-3"><span class="category-badge">${escapeHtml(t.category)}</span></td>
                <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(t.description || '-')}</td>
                <td class="px-4 py-3 text-right font-semibold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}">${isIncome ? '+' : '-'} ${formatCurrency(Math.abs(t.amount), t.currency)}</td>
                <td class="px-4 py-3 text-center"><button onclick="deleteTransactionHandler(${t.id})" class="text-slate-400 hover:text-rose-500"><i class="fas fa-trash-alt"></i></button></td></tr>`;
    }).join('');
}

function renderSummary(summary, month, year) {
    if (!summary) return;
    const incomeTotal = Object.values(summary.income || {}).reduce((a, b) => a + b, 0);
    const expenseTotal = Object.values(summary.expense || {}).reduce((a, b) => a + b, 0);
    const netTotal = incomeTotal - expenseTotal;
    if (document.getElementById('totalIncome')) document.getElementById('totalIncome').innerHTML = formatCurrency(incomeTotal);
    if (document.getElementById('totalExpense')) document.getElementById('totalExpense').innerHTML = formatCurrency(expenseTotal);
    if (document.getElementById('netBalance')) document.getElementById('netBalance').innerHTML = formatCurrency(netTotal);
    if (document.getElementById('balanceDate') && month && year) document.getElementById('balanceDate').innerHTML = `${getThaiMonth(month)} ${getBuddhistYear(year)}`;
    return { incomeTotal, expenseTotal, netTotal };
}

let chartInstance = null;
function renderChart(data) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    if (chartInstance) chartInstance.destroy();
    if (!data?.labels?.length) {
        chartInstance = new Chart(ctx.getContext('2d'), { type: 'doughnut', data: { labels: ['ไม่มีข้อมูล'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }] }, options: { plugins: { legend: { display: false } } } });
        if (document.getElementById('categoryLegend')) document.getElementById('categoryLegend').innerHTML = '<div class="text-slate-400 text-sm text-center col-span-2">ไม่มีรายจ่ายในเดือนนี้</div>';
        return;
    }
    const colors = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#a855f7', '#ec489a', '#06b6d4', '#84cc16'];
    chartInstance = new Chart(ctx.getContext('2d'), { type: 'doughnut', data: { labels: data.labels, datasets: [{ data: data.data, backgroundColor: colors.slice(0, data.labels.length), borderWidth: 0, cutout: '65%' }] }, options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}` } } } } });
    if (document.getElementById('categoryLegend')) document.getElementById('categoryLegend').innerHTML = data.labels.map((label, i) => `<div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full" style="background:${colors[i % colors.length]}"></div><span class="text-xs">${escapeHtml(label)}</span><span class="text-xs font-semibold ml-auto">${formatCurrency(data.data[i])}</span></div>`).join('');
}

function initMonthYearSelects() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    if (!monthSelect || !yearSelect) return;
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    monthSelect.innerHTML = months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    const currentYear = new Date().getFullYear();
    for (let y = 2023; y <= currentYear + 3; y++) { const opt = document.createElement('option'); opt.value = y; opt.textContent = y; if (y === currentYear) opt.selected = true; yearSelect.appendChild(opt); }
    monthSelect.value = new Date().getMonth() + 1;
}