const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

// Token Management Helper
export function getAuthToken() {
    return localStorage.getItem('eso_trade_token') || '';
}

export function setAuthToken(token) {
    if (token) {
        localStorage.setItem('eso_trade_token', token);
    } else {
        localStorage.removeItem('eso_trade_token');
    }
}

function getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

export async function fetchSystemStatus() {
    try {
        const response = await fetch(`${BASE_URL}/api/status`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching system status:', error);
        return { success: false, status: 'offline' };
    }
}

export async function fetchTaxonomy() {
    try {
        const response = await fetch(`${BASE_URL}/api/taxonomy`);
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
        const response = await fetch(`${BASE_URL}/api/market/listings?${query}`, { headers: getHeaders() });
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
        const response = await fetch(`${BASE_URL}/api/market/prices?${query}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching market prices:', error);
        return { total: 0, items: [] };
    }
}

export async function extractLiveListings(search, server = 'NA') {
    try {
        const response = await fetch(`${BASE_URL}/api/market/listings/extract`, {
            method: 'POST',
            headers: getHeaders(),
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
        const response = await fetch(`${BASE_URL}/api/market/dev/clear-listings`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error clearing listings:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// AUTHENTICATION & DEV ACCOUNTS API HELPERS
// ============================================================================

export async function loginUser(usernameOrEmail, password) {
    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        const response = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, eso_handle })
        });
        const data = await response.json();
        if (data.token) setAuthToken(data.token);
        return data;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function fetchCurrentUser() {
    try {
        const response = await fetch(`${BASE_URL}/api/auth/me`, { headers: getHeaders() });
        if (!response.ok) return { success: false };
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function fetchDevUsers() {
    try {
        const response = await fetch(`${BASE_URL}/api/dev/users`, { headers: getHeaders() });
        return await response.json();
    } catch (error) {
        return { success: false, users: [] };
    }
}

export async function devBypassLogin(user_id) {
    try {
        const response = await fetch(`${BASE_URL}/api/dev/bypass-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        const response = await fetch(`${BASE_URL}/api/dev/users/${userId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function devDeleteUser(userId) {
    try {
        const response = await fetch(`${BASE_URL}/api/dev/users/${userId}`, {
            method: 'DELETE',
            headers: getHeaders()
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
        const response = await fetch(`${BASE_URL}/api/characters`, { headers: getHeaders() });
        return await response.json();
    } catch (error) {
        return { success: false, characters: [] };
    }
}

export async function createCharacter(charData) {
    try {
        const response = await fetch(`${BASE_URL}/api/characters`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(charData)
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteCharacter(id) {
    try {
        const response = await fetch(`${BASE_URL}/api/characters/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function fetchCharacterProfile(id) {
    try {
        const response = await fetch(`${BASE_URL}/api/characters/${id}/profile`, {
            headers: getHeaders()
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export default fetchTaxonomy;