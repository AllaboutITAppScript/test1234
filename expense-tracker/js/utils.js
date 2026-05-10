function showLoading() { const el = document.getElementById('loadingOverlay'); if (el) el.style.display = 'flex'; }
function hideLoading() { const el = document.getElementById('loadingOverlay'); if (el) el.style.display = 'none'; }

function formatCurrency(amount, currency = 'THB') {
    const symbols = { THB: '฿', USD: '$', EUR: '€' };
    return `${symbols[currency] || '฿'} ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function formatThaiDate(dateString) {
    return new Date(dateString).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function showAlert(type, title, message = '') {
    Swal.fire({ icon: type, title, text: message, confirmButtonColor: '#667eea' });
}

function getThaiMonth(month) {
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return months[month - 1];
}

function getBuddhistYear(year) { return year + 543; }