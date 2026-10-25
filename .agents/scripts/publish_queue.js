#!/usr/bin/env node
'use strict';
const { createGitHubClient } = require('./github_api');
const { fetchClosedIssues, reconcileMarkdown, parseMatrixTable } = require('./sync_priority_queue');
const FILE = '.agents/PRIORITY_QUEUE.md';
const BRANCH = 'automation/priority-queue';

function validateQueue(markdown, closed) {
    const rows = parseMatrixTable(markdown);
    if (!rows.length || rows.some(r => closed.has(r.issueNum)) || new Set(rows.map(r => r.issueNum)).size !== rows.length) throw new Error('Invalid or stale queue');
    const next = rows.filter(r => r.status.includes('Next Up'));
    if (next.length !== 1 || next[0].blockedBy !== 'None' || rows[0] !== next[0]) throw new Error('Queue must start with one unblocked Next Up');
    if (rows.some((r, i) => r.rankStr !== `**${i + 1}**`)) throw new Error('Queue ranks must be sequential');
    return true;
}
function validateMirrorChanges(files) {
    if (files.some(f => f.filename !== FILE || f.status === 'removed' || f.previous_filename)) throw new Error('Queue branch contains non-mirror changes');
}
async function publishQueue(request, repo) {
    const api = `/repos/${repo}`;
    const repository = await request(api);
    const main = repository.default_branch;
    const issue = await request(`${api}/issues/35`);
    const closed = await fetchClosedIssues(request, true);
    const markdown = reconcileMarkdown(issue.body, closed);
    validateQueue(markdown, closed);
    if ((await request(`${api}/issues/35`)).body !== issue.body) throw new Error('Roadmap changed; retry');
    if (markdown !== issue.body) await request(`${api}/issues/35`, 'PATCH', { body: markdown });
    const head = await request(`${api}/git/ref/heads/${main}`);
    const mirror = await request(`${api}/contents/${FILE}?ref=${head.object.sha}`);
    if (Buffer.from(mirror.content, 'base64').toString('utf8') === markdown) return { changed: false };
    let branch;
    try { branch = await request(`${api}/git/ref/heads/${BRANCH}`); } catch (error) { if (error.status !== 404) throw error; }
    if (branch) validateMirrorChanges((await request(`${api}/compare/${head.object.sha}...${branch.object.sha}`)).files || []);
    const commit = await request(`${api}/git/commits/${head.object.sha}`);
    const tree = await request(`${api}/git/trees`, 'POST', { base_tree: commit.tree.sha,
        tree: [{ path: FILE, mode: '100644', type: 'blob', content: markdown }] });
    const next = await request(`${api}/git/commits`, 'POST', { message: 'docs: synchronize generated priority queue', tree: tree.sha, parents: [head.object.sha] });
    if ((await request(`${api}/git/ref/heads/${main}`)).object.sha !== head.object.sha || (await request(`${api}/issues/35`)).body !== markdown) throw new Error('Main or roadmap changed; retry');
    if (branch) {
        if ((await request(`${api}/git/ref/heads/${BRANCH}`)).object.sha !== branch.object.sha) throw new Error('Queue branch changed; retry');
        // Only the dedicated, validated generated branch is replaced. Never push main.
        await request(`${api}/git/refs/heads/${BRANCH}`, 'PATCH', { sha: next.sha, force: true });
    } else await request(`${api}/git/refs`, 'POST', { ref: `refs/heads/${BRANCH}`, sha: next.sha });
    const owner = repo.split('/')[0];
    const prs = await request(`${api}/pulls?state=open&head=${owner}:${BRANCH}&base=${main}`);
    const body = 'Regenerates only `.agents/PRIORITY_QUEUE.md` from live tracking issue #35 after reconciling closed issues and merged PRs. The live issue remains authoritative until this mirror update is merged.\n\nCI checks the generated-file boundary. Approve workflow execution if GitHub requests it for this bot-created PR; merge after CI passes. No protection bypass or automatic approval is used.';
    const pr = prs[0] || await request(`${api}/pulls`, 'POST', { title: 'docs: synchronize priority queue mirror', head: BRANCH, base: main, body });
    return { changed: true, url: pr.html_url };
}
if (require.main === module) publishQueue(createGitHubClient(), process.env.GITHUB_REPOSITORY || 'Tamriel-Toolkit/ESO-Trade-Project')
    .then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { validateQueue, validateMirrorChanges, publishQueue, FILE, BRANCH };
