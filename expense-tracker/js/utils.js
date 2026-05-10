function showLoading() { 
    const el = document.getElementById('loadingOverlay'); 
    if(el) el.style.display = 'flex'; 
}
function hideLoading() { 
    const el = document.getElementById('loadingOverlay'); 
    if(el) el.style.display = 'none'; 
}
function formatCurrency(amount) { return '฿' + amount.toFixed(2); }
