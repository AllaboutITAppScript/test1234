function renderTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    if(!container) return;
    if(!transactions || transactions.length === 0) {
        container.innerHTML = '<div class=\"p-4 text-center text-gray-400\">ไม่มีรายการ</div>';
        return;
    }
    container.innerHTML = transactions.map(t => 
        <div class=\"p-3 flex justify-between items-center border-b hover:bg-gray-50\">
            <div class=\"text-sm w-24\">\</div>
            <div class=\"text-sm w-24\"><span class=\"category-badge\">\</span></div>
            <div class=\"text-sm flex-1\">\</div>
            <div class=\"font-bold w-28 text-right \\">
                \ ฿\
            </div>
            <button onclick=\"deleteTransactionHandler(\)\" class=\"text-gray-400 hover:text-red-500 ml-2\">
                <i class=\"fas fa-trash-alt\"></i>
            </button>
        </div>
    ).join('');
}
