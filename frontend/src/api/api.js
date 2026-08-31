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
export async function apiFetch(path, options = {}) {
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

/**
 * Safely parse JSON responses even when non-JSON error pages (like HTML 404/500) are returned
 */
async function safeJsonResponse(response, defaultError = 'Request failed') {
    try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok && !data.error) {
                data.error = `Server error (HTTP ${response.status})`;
            }
            return data;
        }
        if (!response.ok) {
            return { 
                success: false, 
                error: `HTTP ${response.status} ${response.statusText} — Please ensure the backend server has been restarted.` 
            };
        }
        return { success: false, error: defaultError };
    } catch (err) {
        return { success: false, error: err.message || defaultError };
    }
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
// AUTHENTICATED MARKETPLACE SAVED SEARCHES
// ============================================================================

export async function fetchSavedSearches() {
    try {
        const response = await apiFetch('/api/saved-searches');
        return await safeJsonResponse(response, 'Unable to load saved searches.');
    } catch (error) {
        return { success: false, saved_searches: [], error: error.message };
    }
}

export async function createSavedSearch(name, filterParams) {
    try {
        const response = await apiFetch('/api/saved-searches', {
            method: 'POST',
            body: JSON.stringify({ name, filter_params: filterParams })
        });
        return await safeJsonResponse(response, 'Unable to save this search.');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function setSavedSearchPinned(searchId, isPinned) {
    try {
        const response = await apiFetch(`/api/saved-searches/${searchId}/pin`, {
            method: 'PATCH',
            body: JSON.stringify({ is_pinned: isPinned })
        });
        return await safeJsonResponse(response, 'Unable to update this saved search.');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteSavedSearch(searchId) {
    try {
        const response = await apiFetch(`/api/saved-searches/${searchId}`, {
            method: 'DELETE'
        });
        return await safeJsonResponse(response, 'Unable to delete this saved search.');
    } catch (error) {
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

// ============================================================================
// BUILD IMPORTER, GEAR DIFF & DEALS API HELPERS
// ============================================================================

export async function fetchSets({ search, category, is_tradeable, limit = 1000, offset = 0 } = {}) {
    try {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (category && category !== "All") params.append("category", category);
        if (is_tradeable !== undefined && is_tradeable !== "") params.append("is_tradeable", is_tradeable);
        if (limit) params.append("limit", limit);
        if (offset) params.append("offset", offset);

        const response = await apiFetch(`/api/sets?${params.toString()}`);
        return await safeJsonResponse(response, 'Failed to fetch sets');
    } catch (error) {
        return { success: false, sets: [], error: error.message };
    }
}

export async function fetchBuilds({ class: buildClass, role, is_curated, search, limit = 50, offset = 0 } = {}) {
    try {
        const params = new URLSearchParams();
        if (buildClass && buildClass !== "All") params.append("class", buildClass);
        if (role && role !== "All") params.append("role", role);
        if (is_curated !== undefined && is_curated !== "") params.append("is_curated", is_curated);
        if (search) params.append("search", search);
        if (limit) params.append("limit", limit);
        if (offset) params.append("offset", offset);

        const response = await apiFetch(`/api/builds?${params.toString()}`);
        return await safeJsonResponse(response, 'Failed to fetch builds');
    } catch (error) {
        return { success: false, builds: [], error: error.message };
    }
}

export async function fetchBuildById(id) {
    try {
        const response = await apiFetch(`/api/builds/${id}`);
        return await safeJsonResponse(response, 'Failed to fetch build details');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function createCustomBuild(buildPayload) {
    try {
        const response = await apiFetch('/api/builds', {
            method: 'POST',
            body: JSON.stringify(buildPayload)
        });
        return await safeJsonResponse(response, 'Failed to create build');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteBuild(id) {
    try {
        const response = await apiFetch(`/api/builds/${id}`, {
            method: 'DELETE'
        });
        return await safeJsonResponse(response, 'Failed to delete build');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export const deleteCustomBuild = deleteBuild;

export async function fetchBuildGearDiff(buildId, characterId) {
    try {
        const response = await apiFetch(`/api/builds/${buildId}/diff/${characterId}`);
        return await safeJsonResponse(response, 'Failed to diff build gear');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function fetchBuildDeals(buildId, { server = "NA", characterId } = {}) {
    try {
        const params = new URLSearchParams();
        params.append("server", server);
        if (characterId) params.append("character_id", characterId);

        const response = await apiFetch(`/api/builds/${buildId}/deals?${params.toString()}`);
        return await safeJsonResponse(response, 'Failed to fetch build deals');
    } catch (error) {
        return { success: false, deals_by_slot: [], error: error.message };
    }
}

export async function resolveSetItem({ set, slot_id, slot_name, weight, weapon } = {}) {
    try {
        const params = new URLSearchParams();
        if (set) params.append("set", set);
        if (slot_id !== undefined) params.append("slot_id", slot_id);
        if (slot_name) params.append("slot_name", slot_name);
        if (weight) params.append("weight", weight);
        if (weapon) params.append("weapon", weapon);

        const response = await apiFetch(`/api/sets/resolve-item?${params.toString()}`);
        return await safeJsonResponse(response, 'Failed to resolve set item');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function fetchCharacterTraits(characterId) {
    try {
        const response = await apiFetch(`/api/characters/${characterId}/traits`);
        return await safeJsonResponse(response, 'Failed to fetch character traits');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function updateCharacterTraits(characterId, payload) {
    try {
        const response = await apiFetch(`/api/characters/${characterId}/traits`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return await safeJsonResponse(response, 'Failed to update character traits');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function fetchTraitMarketMatches(characterId, { server = "NA", limitPerTrait = 3 } = {}) {
    try {
        const params = new URLSearchParams();
        params.append("server", server);
        params.append("limit_per_trait", limitPerTrait);

        const response = await apiFetch(`/api/characters/${characterId}/trait-matches?${params.toString()}`);
        return await safeJsonResponse(response, 'Failed to fetch trait market matches');
    } catch (error) {
        return { success: false, matches: [], error: error.message };
    }
}

/**
 * Trade Request Board Client Functions
 */
export async function fetchTradeRequests(queryParams = {}) {
    try {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
                params.append(key, val);
            }
        });

        const response = await apiFetch(`/api/requests?${params.toString()}`);
        return await safeJsonResponse(response, 'Failed to fetch trade requests');
    } catch (error) {
        return { success: false, requests: [], total: 0, error: error.message };
    }
}

export async function fetchTradeRequestStats(server = "NA") {
    try {
        const params = new URLSearchParams();
        if (server) params.append("server", server);

        const response = await apiFetch(`/api/requests/stats?${params.toString()}`);
        return await safeJsonResponse(response, 'Failed to fetch request stats');
    } catch (error) {
        return { success: false, total_open: 0, total_in_progress: 0, total_fulfilled: 0, total_gold_offered: 0 };
    }
}

export async function fetchCraftableSets() {
    try {
        const response = await apiFetch('/api/requests/craftable-sets');
        return await safeJsonResponse(response, 'Failed to fetch craftable sets');
    } catch (error) {
        return [];
    }
}

export async function createTradeRequest(payload) {
    try {
        const response = await apiFetch('/api/requests', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return await safeJsonResponse(response, 'Failed to create trade request');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function claimTradeRequest(requestId) {
    try {
        const response = await apiFetch(`/api/requests/${requestId}/claim`, {
            method: 'PATCH'
        });
        return await safeJsonResponse(response, 'Failed to claim trade request');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function unclaimTradeRequest(requestId) {
    try {
        const response = await apiFetch(`/api/requests/${requestId}/unclaim`, {
            method: 'PATCH'
        });
        return await safeJsonResponse(response, 'Failed to release claim');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function completeTradeRequest(requestId) {
    try {
        const response = await apiFetch(`/api/requests/${requestId}/complete`, {
            method: 'PATCH'
        });
        return await safeJsonResponse(response, 'Failed to mark order as completed');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function fulfillTradeRequest(requestId) {
    try {
        const response = await apiFetch(`/api/requests/${requestId}/fulfill`, {
            method: 'PATCH'
        });
        return await safeJsonResponse(response, 'Failed to fulfill trade request');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function cancelTradeRequest(requestId) {
    try {
        const response = await apiFetch(`/api/requests/${requestId}`, {
            method: 'DELETE'
        });
        return await safeJsonResponse(response, 'Failed to cancel trade request');
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export default fetchTaxonomy;
