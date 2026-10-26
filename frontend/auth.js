const AUTH_STORAGE_KEY = 'recepttar-auth';

function getAuthState() {
    try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        return stored ? JSON.parse(stored) : { token: '', username: '' };
    } catch {
        return { token: '', username: '' };
    }
}

function saveAuthState(token, username) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, username }));
}

function clearAuthState() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function login(username, password) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Sikertelen bejelentkezés.');
    }

    saveAuthState(data.token, data.username);
    return data;
}

async function register(username, password) {
    throw new Error('A regisztráció le van tiltva. Használja az admin/admin kombinációt.');
}

function getAuthHeader() {
    const { token } = getAuthState();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function isLoggedIn() {
    return Boolean(getAuthState().token);
}

function logoutUser() {
    clearAuthState();
    window.location.reload();
}
