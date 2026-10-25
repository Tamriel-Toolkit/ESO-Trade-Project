#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createGitHubClient, pages } = require('./github_api');
const schema = require('../schemas/pr_review_schema.json');
const ROOT = path.resolve(__dirname, '../..');
const SUMMARY_MARKER = '<!-- tamriel-ai-review:v2 -->';
const LABELS = ['AI review complete', 'AI findings', 'AI review incomplete', 'AI review stale'];
const SHA = /^[a-f0-9]{40}$/;
const MAX_FILE = 60000, MAX_CHUNK = 90000, MAX_CHUNKS = 8;

function validate(value, definition = schema, location = 'review') {
    const fail = () => { throw new Error(`Invalid structured output at ${location}`); };
    if (definition.type === 'object') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
        for (const key of definition.required || []) if (!(key in value)) fail();
        for (const [key, child] of Object.entries(value)) {
            if (!definition.properties[key]) { if (definition.additionalProperties === false) fail(); }
            else validate(child, definition.properties[key], `${location}.${key}`);
        }
    } else if (definition.type === 'array') {
        if (!Array.isArray(value) || value.length > (definition.maxItems ?? Infinity)) fail();
        value.forEach((child, index) => validate(child, definition.items, `${location}[${index}]`));
    } else if (definition.type === 'integer') {
        if (!Number.isInteger(value) || value < (definition.minimum ?? -Infinity)) fail();
    } else if (typeof value !== definition.type) fail();
    if (typeof value === 'string' && (value.trim().length < (definition.minLength ?? 0) || value.length > (definition.maxLength ?? Infinity))) fail();
    if (definition.enum && !definition.enum.includes(value)) fail();
    return value;
}
function parseModelResponse(data) {
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason !== 'STOP') throw new Error('Model response incomplete or blocked');
    const parts = candidate.content?.parts;
    if (!Array.isArray(parts) || parts.some(p => p.functionCall)) throw new Error('Unexpected model response');
    return validate(JSON.parse(parts.filter(p => !p.thought).map(p => p.text || '').join('')));
}
function isAuthorized(permission) { return ['admin', 'maintain', 'write'].includes(permission); }
function requestNumber(eventName, event, input) {
    if (eventName === 'issue_comment') {
        if (!event.issue?.pull_request || event.action !== 'created' || event.comment?.body?.trim() !== '/review') return null;
        return event.issue.number;
    }
    if (eventName !== 'workflow_dispatch') return null;
    const number = Number(input);
    if (!Number.isSafeInteger(number) || number <= 0) throw new Error('Invalid PR number');
    return number;
}
function patchLines(patch) {
    const valid = new Set(); let right = null;
    for (const line of (patch || '').split('\n')) {
        const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) right = Number(match[1]);
        else if (right !== null && (line.startsWith('+') || line.startsWith(' '))) valid.add(right++);
    }
    return valid;
}
function makeChunks(files) {
    const chunks = [], skipped = []; let chunk = [], size = 0;
    for (const file of files) {
        const length = JSON.stringify(file).length;
        if (!file.patch || !file.content || file.content.includes('\0') || length > MAX_FILE) {
            skipped.push({ file: file.filename, reason: 'Binary, unavailable patch/content, or file exceeds review budget' }); continue;
        }
        if (size + length > MAX_CHUNK && chunk.length) { chunks.push(chunk); chunk = []; size = 0; }
        chunk.push(file); size += length;
    }
    if (chunk.length) chunks.push(chunk);
    for (const extra of chunks.slice(MAX_CHUNKS)) for (const f of extra) skipped.push({ file: f.filename, reason: 'Review chunk budget exceeded' });
    return { chunks: chunks.slice(0, MAX_CHUNKS), skipped };
}
function sameRevision(pr, snapshot) { return pr.state === 'open' && pr.head.sha === snapshot.head && pr.base.sha === snapshot.base; }
function fingerprint(finding, head) {
    return crypto.createHash('sha256').update(JSON.stringify([head, finding.file, finding.line, finding.title.trim().toLowerCase()])).digest('hex').slice(0, 24);
}
function determineReviewOutcome(result) {
    if (result.stale) return 'AI review stale';
    if (!result.complete) return 'AI review incomplete';
    validate(result.review);
    return result.review.findings.length || result.review.verdict === 'REQUEST_CHANGES' ? 'AI findings' : 'AI review complete';
}
async function collect(request, repo, number, actor) {
    const api = `/repos/${repo}`;
    const permission = await request(`${api}/collaborators/${encodeURIComponent(actor)}/permission`);
    if (!isAuthorized(permission.permission)) throw new Error('Review requests require Write, Maintain or Admin permission');
    const pr = await request(`${api}/pulls/${number}`);
    if (pr.state !== 'open' || !SHA.test(pr.head.sha) || !SHA.test(pr.base.sha)) throw new Error('Expected an open PR with immutable revisions');
    const compare = await request(`${api}/compare/${pr.base.sha}...${pr.head.sha}`);
    const coverage = [];
    if ((compare.files || []).length !== pr.changed_files) coverage.push('GitHub comparison did not include every changed file');
    const files = [];
    for (const file of compare.files || []) {
        let content = '';
        if (file.patch && file.patch.length <= MAX_FILE && SHA.test(file.sha)) {
            // Even symlinks are read as Git blob data, never resolved on the runner.
            const blob = await request(`${api}/git/blobs/${file.sha}`);
            if (blob.encoding === 'base64' && blob.size <= MAX_FILE) content = Buffer.from(blob.content, 'base64').toString('utf8');
        }
        files.push({ filename: file.filename, status: file.status, patch: file.patch || '', content });
    }
    const linkedIssues = [];
    const numbers = [...new Set([...(`${pr.title}\n${pr.body || ''}`).matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map(m => Number(m[1])))].slice(0, 3);
    for (const issueNumber of numbers) {
        const issue = await request(`${api}/issues/${issueNumber}`);
        linkedIssues.push({ number: issueNumber, title: issue.title, body: (issue.body || '').slice(0, 12000) });
    }
    const snapshot = { version: 2, repo, number, head: pr.head.sha, base: pr.base.sha, actor,
        title: pr.title, body: (pr.body || '').slice(0, 16000), files, linkedIssues, coverage };
    if (!sameRevision(await request(`${api}/pulls/${number}`), snapshot)) throw new Error('PR changed during collection; request another review');
    return snapshot;
}
async function review(snapshot, { key, model = 'gemini-3.8-flash', transport = fetch } = {}) {
    if (!key) throw new Error('GEMINI_API_KEY repository secret is missing');
    if (!/^[a-z0-9.-]+$/.test(model)) throw new Error('Invalid review model');
    const { chunks, skipped } = makeChunks(snapshot.files);
    const instruction = fs.readFileSync(path.join(ROOT, '.agents/prompts/pr_review_prompt.md'), 'utf8');
    const findings = [], summaries = []; let requestsChanges = false;
    for (const files of chunks) {
        const response = await transport(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(120000),
            body: JSON.stringify({ systemInstruction: { parts: [{ text: instruction }] },
                contents: [{ role: 'user', parts: [{ text: JSON.stringify({ title: snapshot.title, description: snapshot.body, linkedIssues: snapshot.linkedIssues, files }) }] }],
                generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: 12000 } }),
        });
        if (!response.ok) throw new Error(`Model API failed (${response.status}); verify API key, quota and model access`);
        const result = parseModelResponse(await response.json());
        const names = new Set(files.map(f => f.filename));
        if (result.findings.some(f => !names.has(f.file))) throw new Error('Model cited a file outside its reviewed chunk');
        findings.push(...result.findings); summaries.push(result.overall_summary);
        requestsChanges ||= result.verdict === 'REQUEST_CHANGES';
    }
    const unique = [...new Map(findings.map(f => [fingerprint(f, snapshot.head), f])).values()];
    if (unique.length > 40) skipped.push({ file: '(review)', reason: 'Finding publication budget exceeded; showing first 40' });
    return { version: 2, head: snapshot.head, base: snapshot.base, model,
        complete: chunks.length > 0 && skipped.length === 0 && snapshot.coverage.length === 0,
        skipped, coverage: snapshot.coverage, chunks: chunks.length,
        review: { verdict: requestsChanges ? 'REQUEST_CHANGES' : unique.length ? 'COMMENT' : 'APPROVE',
            overall_summary: summaries.join('\n\n').slice(0, 12000) || 'No reviewable text changes within the configured budget.', findings: unique.slice(0, 40) },
    };
}
async function updateSummary(request, api, number, body) {
    const comments = await pages(request, `${api}/issues/${number}/comments`);
    const existing = comments.find(c => c.user?.login === 'github-actions[bot]' && c.body?.startsWith(SUMMARY_MARKER));
    if (existing) await request(`${api}/issues/comments/${existing.id}`, 'PATCH', { body });
    else await request(`${api}/issues/${number}/comments`, 'POST', { body });
}
async function setStatus(request, api, number, label) {
    const current = await request(`${api}/issues/${number}/labels`);
    for (const name of [...LABELS, 'Ready', 'Re-Review']) {
        if (name !== label && current.some(l => l.name === name)) await request(`${api}/issues/${number}/labels/${encodeURIComponent(name)}`, 'DELETE');
    }
    await request(`${api}/issues/${number}/labels`, 'POST', { labels: [label] });
}
async function publish(request, snapshot, result) {
    const api = `/repos/${snapshot.repo}`;
    if (result.head !== snapshot.head || result.base !== snapshot.base) throw new Error('Artifact revision mismatch');
    validate(result.review);
    let pr = await request(`${api}/pulls/${snapshot.number}`);
    if (pr.state !== 'open') return;
    result.stale = !sameRevision(pr, snapshot);
    const label = determineReviewOutcome(result);
    const notes = [...(result.coverage || []), ...(result.skipped || []).map(s => `${s.file}: ${s.reason}`)];
    const blocking = result.review.findings.filter(f => ['P0', 'P1'].includes(f.severity)).length;
    const body = `${SUMMARY_MARKER}\n## ${label}\n\nReviewed head: \`${snapshot.head}\`\nBase: \`${snapshot.base}\`\n\n${result.review.overall_summary}\n\nFindings: ${result.review.findings.length}; P0/P1 recommendations: ${blocking}. This is advisory, not approval or merge authorization.\n${notes.length ? '\nCoverage limitations:\n' + notes.map(n => '- ' + n).join('\n') : ''}\n\n${result.stale ? '**The PR has changed. Request a fresh review.**' : 'Run `/review` to review the current revision.'}`;
    await updateSummary(request, api, snapshot.number, body.slice(0, 60000));
    if (!result.stale) {
        const existing = await pages(request, `${api}/pulls/${snapshot.number}/comments`);
        const inline = [], fallback = [];
        for (const finding of result.review.findings) {
            const marker = `<!-- ai-finding:${fingerprint(finding, snapshot.head)} -->`;
            if (existing.some(c => c.user?.login === 'github-actions[bot]' && c.body?.includes(marker))) continue;
            const text = `${marker}\n**[${finding.severity}] ${finding.title}**\n\n${finding.description}\n\nSuggested fix: ${finding.suggested_fix}\n\nDifficulty: ${finding.difficulty}`;
            const file = snapshot.files.find(f => f.filename === finding.file);
            if (!file) throw new Error('Finding outside snapshot');
            if (patchLines(file.patch).has(finding.line) && file.status !== 'removed') inline.push({ path: finding.file, line: finding.line, side: 'RIGHT', body: text });
            else fallback.push(`\n\n${text}\n\nLocation: \`${finding.file}:${finding.line}\``);
        }
        if (fallback.length) await updateSummary(request, api, snapshot.number, (body + fallback.join('')).slice(0, 60000));
        pr = await request(`${api}/pulls/${snapshot.number}`);
        if (inline.length && sameRevision(pr, snapshot)) await request(`${api}/pulls/${snapshot.number}/reviews`, 'POST', {
            commit_id: snapshot.head, event: 'COMMENT', body: 'Advisory findings for this revision; see the AI review summary for coverage.', comments: inline,
        });
    }
    pr = await request(`${api}/pulls/${snapshot.number}`);
    if (pr.state === 'open') await setStatus(request, api, snapshot.number, sameRevision(pr, snapshot) ? label : 'AI review stale');
}
async function stale(request, repo, number) {
    const api = `/repos/${repo}`;
    const pr = await request(`${api}/pulls/${number}`);
    if (pr.state !== 'open') return;
    const comments = await pages(request, `${api}/issues/${number}/comments`);
    const summary = comments.find(c => c.user?.login === 'github-actions[bot]' && c.body?.startsWith(SUMMARY_MARKER));
    if (summary && (!summary.body.includes(`Reviewed head: \`${pr.head.sha}\``) || !summary.body.includes(`Base: \`${pr.base.sha}\``))) {
        await setStatus(request, api, number, 'AI review stale');
        if (!summary.body.includes('**STALE:**')) await request(`${api}/issues/comments/${summary.id}`, 'PATCH', { body: summary.body + '\n\n**STALE:** The PR revision changed. Request `/review` again.' });
    } else if (!summary && pr.labels?.some(l => ['Ready', 'Re-Review'].includes(l.name))) await setStatus(request, api, number, 'AI review stale');
}
async function main() {
    const command = process.argv[2], directory = process.env.REVIEW_DIRECTORY || 'review-data';
    const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
    const write = (name, data) => { fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(path.join(directory, name), JSON.stringify(data)); };
    if (command === 'collect') {
        const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
        const number = requestNumber(process.env.GITHUB_EVENT_NAME, event, process.env.PR_NUMBER);
        if (!number) throw new Error('No authorized review request event');
        write('snapshot.json', await collect(createGitHubClient(), process.env.GITHUB_REPOSITORY, number, process.env.GITHUB_ACTOR));
    } else if (command === 'review') {
        const snapshot = read('snapshot.json');
        try { write('result.json', await review(snapshot, { key: process.env.GEMINI_API_KEY, model: process.env.REVIEW_MODEL || 'gemini-3.8-flash' })); }
        catch (error) {
            write('result.json', { version: 2, head: snapshot.head, base: snapshot.base, complete: false, coverage: [], skipped: [],
                review: { verdict: 'COMMENT', overall_summary: error.message, findings: [] } }); process.exitCode = 1;
        }
    } else if (command === 'publish') await publish(createGitHubClient(), read('snapshot.json'), read('result.json'));
    else if (command === 'stale') {
        const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
        if (!['pull_request', 'push'].includes(event.workflow_run?.event) || event.workflow_run?.repository?.full_name !== process.env.GITHUB_REPOSITORY) return;
        const request = createGitHubClient();
        for (const pr of await pages(request, `/repos/${process.env.GITHUB_REPOSITORY}/pulls?state=open`)) await stale(request, process.env.GITHUB_REPOSITORY, pr.number);
    } else throw new Error('Expected collect, review, publish or stale');
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { validate, parseModelResponse, isAuthorized, requestNumber, patchLines, makeChunks, sameRevision, fingerprint, determineReviewOutcome, collect, review, publish, stale };
