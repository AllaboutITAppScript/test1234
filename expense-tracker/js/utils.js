function showLoading() { let el = document.getElementById("loadingOverlay"); if(el) el.style.display = "flex"; }
function hideLoading() { let el = document.getElementById("loadingOverlay"); if(el) el.style.display = "none"; }
function formatCurrency(amount) { return new Intl.NumberFormat('th-TH').format(amount); }
let darkMode = localStorage.getItem("darkMode") === "true";
function toggleDarkMode() { darkMode = !darkMode; localStorage.setItem("darkMode", darkMode); location.reload(); }
