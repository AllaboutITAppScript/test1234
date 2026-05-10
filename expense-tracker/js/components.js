function renderTransactions(transactions) {
    let container = document.getElementById("transactionsList");
    if(!container) return;
    if(!transactions || transactions.length===0) { container.innerHTML = "<div class=\"p-4 text-center text-gray-400\">ไม่มีรายการ</div>"; return; }
    container.innerHTML = transactions.map(t => `<div class="p-3 flex justify-between items-center border-b">
        <div class="text-sm w-24">${t.expense_date}</div>
        <div class="text-sm w-24"><span class="category-badge">${t.category}</span></div>
        <div class="text-sm flex-1">${t.description||"-"}</div>
        <div class="font-bold w-28 text-right ${t.type==="income"?"text-emerald-500":"text-rose-500"}">${t.type==="income"?"+":"-"} ${Number(t.amount).toFixed(2)}</div>
        <button onclick="deleteTransactionHandler(${t.id})" class="text-gray-400 hover:text-red-500"><i class="fas fa-trash-alt"></i></button>
    </div>`).join("");
}
