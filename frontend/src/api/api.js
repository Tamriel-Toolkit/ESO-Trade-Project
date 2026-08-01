const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

export async function fetchTaxonomy() {
    try {
        const response = await fetch(`${BASE_URL}/api/taxonomy`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching taxonomy:', error);
        return {};
    }
}

export async function fetchMarketListings(params = {}) {
    try {
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${BASE_URL}/api/market/listings?${query}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
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
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ search, server })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
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
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error clearing listings:', error);
        return { success: false, error: error.message };
    }
}

export default fetchTaxonomy;