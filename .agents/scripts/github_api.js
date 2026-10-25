'use strict';
function createGitHubClient(token = process.env.GITHUB_TOKEN, transport = fetch) {
    if (!token) throw new Error('GITHUB_TOKEN is required');
    return async function request(endpoint, method = 'GET', body) {
        if (!endpoint.startsWith('/')) throw new Error('Expected a GitHub API path');
        const response = await transport(`https://api.github.com${endpoint}`, {
            method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
                'User-Agent': 'Tamriel-Toolkit-Automation', 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw Object.assign(new Error(`GitHub ${method} failed (${response.status})`), { status: response.status });
        return response.status === 204 ? null : response.json();
    };
}
async function pages(request, endpoint) {
    const result = [];
    for (let page = 1; page <= 100; page++) {
        const batch = await request(`${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
        if (!Array.isArray(batch)) throw new Error('Expected paginated array');
        result.push(...batch);
        if (batch.length < 100) return result;
    }
    throw new Error('Pagination limit exceeded');
}
module.exports = { createGitHubClient, pages };
