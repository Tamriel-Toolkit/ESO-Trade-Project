const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

// In-memory token store with localStorage fallback for multi-tab/client resilience
let inMemoryToken = '';

// Token Management Helpers
export function getAuthToken() {
    return inMemoryToken || localStorage.getItem('eso_trade_token') || '';
}

export function setAuthToken(token) {
    inMemoryToken = token || '';
    if (token) {
        localStorage.setItem('eso_trade_token', token);
    } else {
        localStorage.removeItem('eso_trade_token');
    }
}

function getHeaders(customHeaders = {}) {
    const headers = { 'Content-Type': 'application/json', ...customHeaders };
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * Universal fetch wrapper enforcing credentials: 'include' for HttpOnly SameSite cookies
 */
async function apiFetch(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = getHeaders(options.headers);
    const config = {
        credentials: 'include',
        ...options,
        headers
    };
    const response = await fetch(url, config);

    // If session expired on protected routes (excluding login/register), broadcast auth:unauthorized
    if (response.status === 401 && !path.startsWith('/api/auth/login') && !path.startsWith('/api/auth/register')) {
        setAuthToken('');
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
    }

    return response;
}

export async function fetchSystemStatus() {
    try {
        const response = await apiFetch('/api/status');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching system status:', error);
        return { success: false, status: 'offline' };
    }
}

export async function fetchTaxonomy() {
    try {
        const response = await apiFetch('/api/taxonomy');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching taxonomy:', error);
        return {};
    }
}

export async function fetchMarketListings(params = {}) {
    try {
        const query = new URLSearchParams(params).toString();
        const response = await apiFetch(`/api/market/listings?${query}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching market listings:', error);
        return { total: 0, listings: [] };
    }
}

export async function fetchMarketPrices(params = {}) {
    try {
        const query = new URLSearchParams(params).toString();
        const response = await apiFetch(`/api/market/prices?${query}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching market prices:', error);
        return { total: 0, items: [] };
    }
}

export async function extractLiveListings(search, server = 'NA') {
    try {
        const response = await apiFetch('/api/market/listings/extract', {
            method: 'POST',
            body: JSON.stringify({ search, server })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error extracting live listings:', error);
        return { success: false, count: 0, listings: [] };
    }
}

export async function clearAllListings() {
    try {
        const response = await apiFetch('/api/market/dev/clear-listings', {
            method: 'POST'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error clearing listings:', error);
        return { success: false, error: error.message };
    }
}

export async function purgeExpiredListings() {
    try {
        const response = await apiFetch('/api/market/listings/purge-expired', {
            method: 'POST'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error purging expired listings:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// AUTHENTICATION & DEV ACCOUNTS API HELPERS
// ============================================================================

export async function loginUser(usernameOrEmail, password) {
    try {
        const response = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ usernameOrEmail, password })
        });
        const data = await response.json();
        if (data.token) setAuthToken(data.token);
        return data;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function registerUser(username, email, password, eso_handle) {
    try {
        const response = await apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, eso_handle })
        });
        const data = await response.json();
        if (data.token) setAuthToken(data.token);
        return data;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function logoutUser() {
    try {
        const response = await apiFetch('/api/auth/logout', {
            method: 'POST'
        });
        setAuthToken('');
        return await response.json();
    } catch (error) {
        setAuthToken('');
        return { success: false, error: error.message };
    }
}

export async function fetchCurrentUser() {
    try {
        const response = await apiFetch('/api/auth/me');
        if (!response.ok) return { success: false };
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function fetchDevUsers() {
    try {
        const response = await apiFetch('/api/dev/users');
        return await response.json();
    } catch (error) {
        return { success: false, users: [] };
    }
}

export async function devBypassLogin(user_id) {
    try {
        const response = await apiFetch('/api/dev/bypass-login', {
            method: 'POST',
            body: JSON.stringify({ user_id })
        });
        const data = await response.json();
        if (data.token) setAuthToken(data.token);
        return data;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function devUpdateUser(userId, data) {
    try {
        const response = await apiFetch(`/api/dev/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function devDeleteUser(userId) {
    try {
        const response = await apiFetch(`/api/dev/users/${userId}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================================================
// CHARACTER MANAGER API HELPERS
// ============================================================================

export async function fetchCharacters() {
    try {
        const response = await apiFetch('/api/characters');
        return await response.json();
    } catch (error) {
        return { success: false, characters: [] };
    }
}

export async function createCharacter(charData) {
    try {
        const response = await apiFetch('/api/characters', {
            method: 'POST',
            body: JSON.stringify(charData)
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteCharacter(id) {
    try {
        const response = await apiFetch(`/api/characters/${id}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function fetchCharacterProfile(id) {
    try {
        const response = await apiFetch(`/api/characters/${id}/profile`);
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export default fetchTaxonomy;