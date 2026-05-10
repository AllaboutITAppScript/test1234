let liffId = '2010029314-R9ysVoiR'; // เปลี่ยนเปน LIFF ID ของคุ
let currentUser = null;
let currentPage = "home";
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();
let transactionType = "expense";
let chart1 = null;
let chart2 = null;

// Loading functions
function showLoading() {
    let el = document.getElementById('loadingOverlay');
    if (el) el.style.display = 'flex';
}
function hideLoading() {
    let el = document.getElementById('loadingOverlay');
    if (el) el.style.display = 'none';
}

// API Calls with error handling
const API_BASE = window.location.origin + '/api';

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': currentUser?.userId || '',
                ...options.headers
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function getExpenses(month, year) {
    return apiCall(`/expenses?month=${month}&year=${year}&userId=${currentUser?.userId}`);
}

async function addExpense(data) {
    return apiCall('/expenses', {
        method: 'POST',
        body: JSON.stringify({ ...data, userId: currentUser?.userId })
    });
}

async function updateExpense(id, data) {
    return apiCall(`/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, userId: currentUser?.userId })
    });
}

async function deleteExpense(id) {
    return apiCall(`/expenses/${id}?userId=${currentUser?.userId}`, { method: 'DELETE' });
}

async function getMonthlySummary(month, year) {
    return apiCall(`/summary/monthly?month=${month}&year=${year}&userId=${currentUser?.userId}`);
}

async function getCategorySummary(month, year) {
    return apiCall(`/categories?month=${month}&year=${year}&userId=${currentUser?.userId}`);
}

async function getBudgets(month, year) {
    return apiCall(`/budgets?month=${month}&year=${year}&userId=${currentUser?.userId}`);
}

async function setBudgets(month, year, budgets) {
    return apiCall('/budgets', {
        method: 'POST',
        body: JSON.stringify({ month, year, budgets, userId: currentUser?.userId })
    });
}

async function exportToCSV(month, year) {
    try {
        const response = await fetch(`${API_BASE}/export/csv?month=${month}&year=${year}&userId=${currentUser?.userId}`);
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();

        if (data.length === 0) {
            Swal.fire("ไม่มีข้อมล", "ไม่มีรายการในช่วงเวลานี้", "warning");
            return;
        }

        let csv = "วันที่,ประเภท,จำนวน,สกุลเงิน,หมวดหม่,รายละเอียด\n";
        data.forEach(exp => {
            csv += `${exp.expense_date},${exp.type === 'income' ? 'รายรับ' : 'รายจ่าย'},${exp.amount},${exp.currency},${exp.category},${exp.description || '-'}\n`;
        });

        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `expenses_${month}_${year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Swal.fire("ส่งออกสำเรจ", "ดาวนหลดไฟล CSV แล้ว", "success");
    } catch (error) {
        Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
    }
}

// LIFF Login
async function initLIFF() {
    try {
        await liff.init({ liffId: liffId });
        console.log('LIFF initialized');

        if (!liff.isLoggedIn()) {
            console.log('Not logged in, showing login button');
            document.getElementById('loginContainer').style.display = 'flex';
            document.getElementById('mainApp').style.display = 'none';
        } else {
            console.log('Already logged in');
            await getProfile();
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            initApp();
        }
    } catch (err) {
        console.error('LIFF initialization failed', err);
        // Fallback: ใช้ LocalStorage แทน
        currentUser = { userId: 'guest', displayName: 'ผ้ใช้', pictureUrl: '' };
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        initApp();
    }
}

async function getProfile() {
    try {
        const profile = await liff.getProfile();
        currentUser = {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl
        };

        document.getElementById('userName').innerText = profile.displayName;
        if (profile.pictureUrl) {
            document.getElementById('profilePic').src = profile.pictureUrl;
        }
    } catch (err) {
        console.error('Failed to get profile', err);
        currentUser = { userId: 'guest', displayName: 'ผ้ใช้', pictureUrl: '' };
        document.getElementById('userName').innerText = 'ผ้ใช้';
    }
}

async function logout() {
    if (liff.isLoggedIn()) {
        liff.logout();
    }
    window.location.reload();
}

// Navigation
function switchPage(page) {
    currentPage = page;
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(`page-${page}`).classList.add("active");
    document.querySelectorAll(".nav-item").forEach(item => {
        if (item.dataset.page === page) item.classList.add("active");
        else item.classList.remove("active");
    });

    if (page === "home") loadHome();
    if (page === "transactions") loadTransactions();
    if (page === "reports") loadReports();
    if (page === "budget") loadBudgetPage();
}

// Load data
async function loadHome() {
    showLoading();
    try {
        const [expenses, summary, cats] = await Promise.all([
            getExpenses(currentMonth, currentYear),
            getMonthlySummary(currentMonth, currentYear),
            getCategorySummary(currentMonth, currentYear)
        ]);

        const recent = expenses.slice(0, 5);
        document.getElementById("recentTransactions").innerHTML = recent.map(t => `
            <div class="transaction-item">
                <div>
                    <div><i class="fas fa-tag"></i> ${t.category}</div>
                    <div class="text-xs"><i class="far fa-calendar-alt"></i> ${t.expense_date}</div>
                </div>
                <div class="${t.type === "income" ? "amount-income" : "amount-expense"}">
                    ${t.type === "income" ? "<i class='fas fa-plus-circle'></i>" : "<i class='fas fa-minus-circle'></i>"} 
                    ${t.amount} ${t.currency}
                </div>
            </div>
        `).join("") || "<div class='text-white/70 text-center py-4'><i class='fas fa-inbox'></i> ไม่มีรายการ</div>";

        document.getElementById("totalIncome").innerHTML = summary.income.THB.toFixed(2);
        document.getElementById("totalExpense").innerHTML = summary.expense.THB.toFixed(2);
        document.getElementById("netBalance").innerHTML = summary.net.THB.toFixed(2);

        if (chart1) chart1.destroy();
        const ctx = document.getElementById("categoryChart").getContext('2d');
        chart1 = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: cats.labels.length ? cats.labels : ["ไม่มีข้อมล"],
                datasets: [{
                    data: cats.data.length ? cats.data : [1],
                    backgroundColor: ["#818cf8", "#f97316", "#34d399", "#f87171", "#a855f7"]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: 'white' },
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Load home error:', error);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถหลดข้อมลได้ กรุาลองใหม่", "error");
    } finally {
        hideLoading();
    }
}

async function loadTransactions() {
    showLoading();
    try {
        const expenses = await getExpenses(currentMonth, currentYear);
        document.getElementById("allTransactionsList").innerHTML = expenses.map(t => `
            <div class="transaction-item">
                <div>
                    <div><i class="fas fa-tag"></i> ${t.category}</div>
                    <div class="text-sm text-white/60"><i class="far fa-calendar-alt"></i> ${t.expense_date}</div>
                    <div class="text-xs"><i class="fas fa-align-left"></i> ${t.description || '-'}</div>
                </div>
                <div class="text-right">
                    <div class="${t.type === "income" ? "amount-income" : "amount-expense"} font-bold">
                        ${t.type === "income" ? "+" : "-"} ${t.amount} ${t.currency}
                    </div>
                    <div class="mt-2">
                        <button class="edit-btn" onclick="editTransaction(${t.id})"><i class="fas fa-edit"></i> แก้ไข</button>
                        <button class="delete-btn" onclick="deleteTrans(${t.id})"><i class="fas fa-trash"></i> ลบ</button>
                    </div>
                </div>
            </div>
        `).join("") || "<div class='text-white/70 text-center py-8'><i class='fas fa-inbox fa-3x'></i><p class='mt-2'>ไม่มีรายการ</p></div>";
    } catch (error) {
        console.error('Load transactions error:', error);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถหลดรายการได้", "error");
    } finally {
        hideLoading();
    }
}

async function loadReports() {
    showLoading();
    try {
        const [summary, cats] = await Promise.all([
            getMonthlySummary(currentMonth, currentYear),
            getCategorySummary(currentMonth, currentYear)
        ]);

        if (chart2) chart2.destroy();
        const ctx = document.getElementById("trendChart").getContext('2d');
        chart2 = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["รายรับ", "รายจ่าย", "คงเหลือ"],
                datasets: [{
                    label: "บาท",
                    data: [summary.income.THB, summary.expense.THB, summary.net.THB],
                    backgroundColor: ["#34d399", "#f87171", "#818cf8"],
                    borderRadius: 10
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: 'white' } }
                },
                scales: {
                    y: {
                        ticks: { color: 'white' },
                        grid: { color: '#334155' }
                    },
                    x: {
                        ticks: { color: 'white' },
                        grid: { color: '#334155' }
                    }
                }
            }
        });

        let top = cats.labels.map((l, i) => ({ name: l, value: cats.data[i] }))
            .sort((a, b) => b.value - a.value).slice(0, 5);
        document.getElementById("topCategories").innerHTML = top.map(t => `
            <div class="flex justify-between items-center py-2 border-b border-gray-700">
                <span class="text-white"><i class="fas fa-chart-line"></i> ${t.name}</span>
                <span class="text-rose-400 font-bold">${t.value.toFixed(2)} บาท</span>
            </div>
        `).join("") || "<div class='text-white/70 text-center py-4'><i class='fas fa-chart-simple'></i> ไม่มีข้อมล</div>";
    } catch (error) {
        console.error('Load reports error:', error);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถหลดรายงานได้", "error");
    } finally {
        hideLoading();
    }
}

async function loadBudgetPage() {
    showLoading();
    try {
        const budgets = await getBudgets(currentMonth, currentYear);
        document.getElementById("budgetThb").value = budgets.THB || "";
        document.getElementById("budgetUsd").value = budgets.USD || "";
        document.getElementById("budgetEur").value = budgets.EUR || "";

        const summary = await getMonthlySummary(currentMonth, currentYear);
        const alertDiv = document.getElementById("budgetAlert");
        if (budgets.THB > 0 && summary.expense.THB > budgets.THB) {
            alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ⚠️ เกินงบ! ใช้ไป ${summary.expense.THB.toFixed(2)} / ${budgets.THB} บาท`;
        } else if (budgets.THB > 0) {
            alertDiv.innerHTML = `<i class="fas fa-check-circle"></i> ✅ ยังอย่ในวงเงิน ${summary.expense.THB.toFixed(2)} / ${budgets.THB} บาท`;
        } else {
            alertDiv.innerHTML = "";
        }
    } catch (error) {
        console.error('Load budget error:', error);
    } finally {
        hideLoading();
    }
}

// Transaction handlers
window.deleteTrans = async (id) => {
    const result = await Swal.fire({
        title: "ยืนยันการลบ",
        text: "คุแน่ใจที่จะลบรายการนี้?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        confirmButtonText: "<i class='fas fa-trash'></i> ลบ",
        cancelButtonText: "<i class='fas fa-times'></i> ยกเลิก"
    });

    if (result.isConfirmed) {
        showLoading();
        try {
            await deleteExpense(id);
            await loadTransactions();
            await loadHome();
            Swal.fire("ลบสำเรจ!", "", "success");
        } catch (error) {
            Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
        } finally {
            hideLoading();
        }
    }
};

window.editTransaction = async (id) => {
    try {
        const expenses = await getExpenses(currentMonth, currentYear);
        const expense = expenses.find(e => e.id === id);
        if (expense) {
            document.getElementById("expenseDate").value = expense.expense_date;
            document.getElementById("amount").value = expense.amount;
            document.getElementById("category").value = expense.category;
            document.getElementById("currency").value = expense.currency;
            document.getElementById("description").value = expense.description || "";
            document.getElementById("editId").value = expense.id;
            transactionType = expense.type;
            document.getElementById("addTitle").innerHTML = "<i class='fas fa-edit'></i> แก้ไขรายการ";
            switchPage("add");
        }
    } catch (error) {
        Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
    }
};

async function saveTransaction() {
    const expenseDate = document.getElementById("expenseDate").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const category = document.getElementById("category").value;
    const currency = document.getElementById("currency").value;
    const description = document.getElementById("description").value;
    const editId = document.getElementById("editId").value;

    if (!expenseDate) {
        Swal.fire("กรุาเลือกวันที่", "", "warning");
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        Swal.fire("กรุากรอกจำนวนเงินที่ถกต้อง", "", "warning");
        return;
    }

    const transaction = {
        expense_date: expenseDate,
        type: transactionType,
        amount: amount,
        category: category,
        description: description || "-",
        currency: currency
    };

    showLoading();
    try {
        if (editId) {
            await updateExpense(parseInt(editId), transaction);
            Swal.fire("แก้ไขสำเรจ!", "", "success");
        } else {
            await addExpense(transaction);
            Swal.fire("บันทึกสำเรจ!", "", "success");
        }
        document.getElementById("amount").value = "";
        document.getElementById("description").value = "";
        document.getElementById("editId").value = "";
        document.getElementById("addTitle").innerHTML = "<i class='fas fa-plus-circle'></i> เพิ่มรายการ";
        transactionType = "expense";
        switchPage("home");
        await loadHome();
    } catch (error) {
        Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
    } finally {
        hideLoading();
    }
}

function cancelEdit() {
    document.getElementById("amount").value = "";
    document.getElementById("description").value = "";
    document.getElementById("editId").value = "";
    document.getElementById("addTitle").innerHTML = "<i class='fas fa-plus-circle'></i> เพิ่มรายการ";
    switchPage("home");
}

// Initialize
function initSelects() {
    const monthSelect = document.getElementById("monthSelect");
    for (let i = 1; i <= 12; i++) {
        monthSelect.insertAdjacentHTML("beforeend", `<option value="${i}">${i}</option>`);
    }
    monthSelect.value = currentMonth;
    monthSelect.addEventListener("change", (e) => {
        currentMonth = parseInt(e.target.value);
        if (currentPage === 'transactions') loadTransactions();
        if (currentPage === 'home') loadHome();
        if (currentPage === 'reports') loadReports();
    });

    const yearSelect = document.getElementById("yearSelect");
    for (let y = 2020; y <= 2030; y++) {
        yearSelect.insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`);
    }
    yearSelect.value = currentYear;
    yearSelect.addEventListener("change", (e) => {
        currentYear = parseInt(e.target.value);
        if (currentPage === 'transactions') loadTransactions();
        if (currentPage === 'home') loadHome();
        if (currentPage === 'reports') loadReports();
    });

    document.getElementById("expenseDate").valueAsDate = new Date();
}

function initApp() {
    initSelects();
    loadHome();

    // Event listeners
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => switchPage(item.dataset.page));
    });

    document.getElementById("fabAddBtn")?.addEventListener("click", () => {
        document.getElementById("editId").value = "";
        document.getElementById("addTitle").innerHTML = "<i class='fas fa-plus-circle'></i> เพิ่มรายการ";
        document.getElementById("amount").value = "";
        document.getElementById("description").value = "";
        switchPage("add");
    });

    document.getElementById("viewAllBtn")?.addEventListener("click", () => switchPage("transactions"));
    document.getElementById("typeExpenseBtn")?.addEventListener("click", () => transactionType = "expense");
    document.getElementById("typeIncomeBtn")?.addEventListener("click", () => transactionType = "income");
    document.getElementById("saveTransactionBtn")?.addEventListener("click", saveTransaction);
    document.getElementById("cancelEditBtn")?.addEventListener("click", cancelEdit);
    document.getElementById("saveBudgetBtn")?.addEventListener("click", async () => {
        const budgets = {
            THB: parseFloat(document.getElementById("budgetThb").value) || 0,
            USD: parseFloat(document.getElementById("budgetUsd").value) || 0,
            EUR: parseFloat(document.getElementById("budgetEur").value) || 0
        };
        showLoading();
        try {
            await setBudgets(currentMonth, currentYear, budgets);
            Swal.fire("บันทึกงบประมาแล้ว", "", "success");
            await loadBudgetPage();
        } catch (error) {
            Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
        } finally {
            hideLoading();
        }
    });

    document.getElementById("filterBtn")?.addEventListener("click", () => loadTransactions());
    document.getElementById("exportBtn")?.addEventListener("click", () => exportToCSV(currentMonth, currentYear));
    document.getElementById("logoutBtn")?.addEventListener("click", logout);
    document.getElementById("liffLoginBtn")?.addEventListener("click", () => {
        liff.login();
    });
}

// Start
initLIFF();
