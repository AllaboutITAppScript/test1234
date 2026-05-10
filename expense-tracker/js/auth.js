let currentUser = null;

async function initLiff() {
    try {
        await liff.init({ liffId: 'YOUR_LIFF_ID' });
        if (!liff.isLoggedIn()) { liff.login(); return; }
        const profile = await liff.getProfile();
        currentUser = profile;
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) userDisplay.innerText = profile.displayName;
        const result = await lineAuth(profile.userId, profile.displayName);
        if (result.token) localStorage.setItem('token', result.token);
        if (typeof loadAllData === 'function') await loadAllData();
    } catch (err) { console.error('LIFF Error:', err); }
}

function logout() { localStorage.clear(); if (liff.isLoggedIn()) liff.logout(); window.location.reload(); }
function isLoggedIn() { return !!localStorage.getItem('token'); }