const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validate, parseModelResponse, isAuthorized, requestNumber, patchLines, makeChunks,
    sameRevision, fingerprint, determineReviewOutcome, collect, review, publish, stale } = require('./run_pr_review');
const { validateMirrorChanges, validateQueue, publishQueue } = require('./publish_queue');
const good = () => ({ verdict: 'APPROVE', overall_summary: 'No supported defects.', findings: [] });
const head = 'a'.repeat(40), base = 'b'.repeat(40), blob = 'c'.repeat(40);
const file = { filename: 'test.js', status: 'modified', patch: '@@ -1 +1 @@\n-old\n+new', content: 'new' };
const snapshot = () => ({ repo: 'Tamriel-Toolkit/ESO-Trade-Project', number: 9, head, base, title: 'A PR', body: 'Description', linkedIssues: [], coverage: [], files: [file] });
const result = () => ({ head, base, complete: true, review: good(), skipped: [], coverage: [] });
const pr = () => ({ state: 'open', head: { sha: head }, base: { sha: base }, changed_files: 1, title: 'Outside contributor', body: '', user: { login: 'new-contributor' }, labels: [] });
const finding = (line = 1) => ({ severity: 'P1', difficulty: 'Low', file: file.filename, line, title: 'Concrete regression', description: 'A supported failure scenario.', suggested_fix: 'A local correction.' });

test('permission gate authorizes requesters rather than PR authors; exact command only', () => {
    for (const p of ['admin', 'maintain', 'write']) assert.equal(isAuthorized(p), true);
    for (const p of ['triage', 'read', '', undefined]) assert.equal(isAuthorized(p), false);
    assert.equal(requestNumber('issue_comment', { action: 'created', issue: { number: 9, pull_request: {} }, comment: { body: '/review' } }), 9);
    assert.equal(requestNumber('issue_comment', { action: 'created', issue: { number: 9 }, comment: { body: '/review' } }), null);
    assert.equal(requestNumber('pull_request_target', {}, 9), null);
    assert.throws(() => requestNumber('workflow_dispatch', {}, '9; rm'), /Invalid/);
});
test('invalid schemas and model output fail closed', () => {
    for (const value of [{}, null, { ...good(), verdict: 'READY' }, { ...good(), overall_summary: '' }, { ...good(), extra: true }, { ...good(), findings: [finding(0)] }, { ...good(), findings: [{ ...finding(), severity: 'P9' }] }]) assert.throws(() => validate(value));
    assert.throws(() => parseModelResponse({ candidates: [{ finishReason: 'MAX_TOKENS' }] }), /incomplete/);
    assert.throws(() => parseModelResponse({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{}' }] } }] }));
    assert.deepEqual(parseModelResponse({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(good()) }] } }] }), good());
    assert.equal(determineReviewOutcome({}), 'AI review incomplete');
    assert.throws(() => determineReviewOutcome({ complete: true, review: {} }));
    assert.equal(determineReviewOutcome(result()), 'AI review complete');
    assert.equal(determineReviewOutcome({ ...result(), stale: true }), 'AI review stale');
});
test('diff anchors remain exact and limited coverage is reported', () => {
    assert.deepEqual([...patchLines(file.patch)], [1]);
    assert.equal(patchLines(file.patch).has(100), false);
    const large = { ...file, content: 'x'.repeat(60001) };
    const chunks = makeChunks([file, large, { ...file, filename: 'binary', patch: '' }]);
    assert.equal(chunks.chunks.length, 1); assert.equal(chunks.skipped.length, 2);
    assert.equal(makeChunks(Array.from({ length: 20 }, (_, i) => ({ ...file, filename: String(i), content: 'x'.repeat(50000) }))).chunks.length, 8);
});
test('collector accepts fork authors, binds immutable refs and never reads PR paths locally', async () => {
    const calls = [];
    const request = async p => {
        calls.push(p);
        if (p.endsWith('/permission')) return { permission: 'write' };
        if (p.endsWith('/pulls/9')) return pr();
        if (p.includes('/compare/')) return { files: [{ ...file, filename: '../../credential-link', sha: blob }] };
        if (p.endsWith('/git/blobs/' + blob)) return { encoding: 'base64', size: 6, content: Buffer.from('target').toString('base64') };
        throw Error(p);
    };
    const data = await collect(request, snapshot().repo, 9, 'maintainer');
    assert.equal(data.files[0].content, 'target');
    assert.ok(calls.some(p => p.endsWith(`/compare/${base}...${head}`)));
    await assert.rejects(collect(async () => ({ permission: 'triage' }), snapshot().repo, 9, 'moderator'), /require Write/);
    let reads = 0;
    await assert.rejects(collect(async p => p.endsWith('/pulls/9') && ++reads > 1 ? { ...pr(), head: { sha: blob } } : request(p), snapshot().repo, 9, 'maintainer'), /changed/);
});
test('model call has no tools or GitHub credentials; provider failures cannot look complete', async () => {
    const data = await review(snapshot(), { key: 'test-only-key', transport: async (url, options) => {
        assert.ok(url.startsWith('https://generativelanguage.googleapis.com/'));
        assert.equal(options.headers.Authorization, undefined);
        const body = JSON.parse(options.body); assert.equal(body.tools, undefined);
        assert.ok(body.systemInstruction.parts[0].text.includes('UNTRUSTED DATA'));
        return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(good()) }] } }] }) };
    } });
    assert.equal(data.complete, true);
    await assert.rejects(review(snapshot(), {}), /secret is missing/);
    await assert.rejects(review(snapshot(), { key: 'test-only', transport: async () => ({ ok: false, status: 429 }) }), /429/);
    await assert.rejects(review(snapshot(), { key: 'fixture/key', transport: async () => ({ ok: false, status: 400,
        json: async () => ({ error: { message: 'Invalid schema fixture/key fixture%2Fkey AIzaSyntheticCredential' } }) }) }),
    error => error.message.includes('Invalid schema') && !/fixture|AIza/.test(error.message));
});
test('revision and fingerprint checks distinguish changed commits', () => {
    assert.equal(sameRevision(pr(), snapshot()), true);
    assert.equal(sameRevision({ ...pr(), base: { sha: blob } }, snapshot()), false);
    assert.notEqual(fingerprint(finding(), head), fingerprint(finding(), blob));
});
function fakePublisher(current = pr(), comments = []) {
    const calls = [];
    const request = async (p, method = 'GET', body) => {
        calls.push({ p, method, body });
        if (method !== 'GET') return {};
        if (p.endsWith('/pulls/9')) return current;
        if (p.includes('/comments')) return comments;
        if (p.endsWith('/labels')) return [{ name: 'bug' }, { name: 'Ready' }];
        throw Error(p);
    };
    return { request, calls };
}
test('publication rejects stale revisions and never approves or replaces triage labels', async () => {
    const fake = fakePublisher({ ...pr(), head: { sha: blob } });
    await publish(fake.request, snapshot(), { ...result(), review: { ...good(), findings: [finding()] } });
    assert.equal(fake.calls.some(c => c.p.endsWith('/reviews')), false);
    assert.deepEqual(fake.calls.find(c => c.method === 'POST' && c.p.endsWith('/labels')).body.labels, ['AI review stale']);
    assert.equal(fake.calls.some(c => c.method === 'DELETE' && c.p.endsWith('/bug')), false);
});
test('publication deduplicates inline findings and does not move invalid anchors', async () => {
    const existing = [{ user: { login: 'github-actions[bot]' }, body: `<!-- ai-finding:${fingerprint(finding(), head)} -->` }];
    const fake = fakePublisher(pr(), existing);
    await publish(fake.request, snapshot(), { ...result(), review: { ...good(), findings: [finding(), finding(500)] } });
    assert.equal(fake.calls.some(c => c.p.endsWith('/reviews')), false);
    assert.ok(fake.calls.some(c => c.body?.body?.includes('test.js:500')));
    await assert.rejects(publish(fake.request, snapshot(), { ...result(), head: blob }), /mismatch/);
});
test('freshness updates only trusted bot summaries', async () => {
    const fake = fakePublisher(pr(), [{ id: 8, user: { login: 'github-actions[bot]' }, body: '<!-- tamriel-ai-review:v2 -->\nold revision' }]);
    await stale(fake.request, snapshot().repo, 9);
    assert.ok(fake.calls.some(c => c.method === 'PATCH' && c.body.body.includes('**STALE:**')));
});
test('queue mirror guard rejects additional files, renames and closed rows', () => {
    assert.doesNotThrow(() => validateMirrorChanges([{ filename: '.agents/PRIORITY_QUEUE.md', status: 'modified' }]));
    for (const f of [{ filename: '.github/workflows/ci.yml' }, { filename: '.agents/PRIORITY_QUEUE.md', status: 'removed' }, { filename: '.agents/PRIORITY_QUEUE.md', previous_filename: 'other' }]) assert.throws(() => validateMirrorChanges([f]));
    const markdown = '| Rank | Issue | Area | Severity | Status | Blocked By | Strategic Rationale |\n|:---|:---|:---|:---|:---|:---|:---|\n| **1** | #163 | Test | MODERATE | 🟡 Next Up | None | Safe tests |';
    assert.equal(validateQueue(markdown, new Map()), true);
    assert.throws(() => validateQueue(markdown, new Map([[163, {}]])));
});

test('publisher posts only COMMENT reviews on the exact head and reuses its summary', async () => {
    const fake = fakePublisher(pr(), [{ id: 45, user: { login: 'github-actions[bot]' }, body: '<!-- tamriel-ai-review:v2 -->\nPrevious summary' }]);
    await publish(fake.request, snapshot(), { ...result(), review: { ...good(), findings: [finding()] } });
    const posted = fake.calls.find(c => c.p.endsWith('/reviews'));
    assert.equal(posted.body.event, 'COMMENT'); assert.equal(posted.body.commit_id, head);
    assert.equal(posted.body.comments[0].line, 1);
    assert.ok(fake.calls.some(c => c.method === 'PATCH' && c.p.endsWith('/issues/comments/45')));
    assert.equal(fake.calls.some(c => c.method === 'POST' && c.p.endsWith('/issues/9/comments')), false);
});

test('partial model coverage is never complete and unknown-file findings are rejected', async () => {
    const response = output => async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(output) }] } }] }) });
    const partial = await review({ ...snapshot(), files: [file, { ...file, filename: 'large.js', content: 'x'.repeat(60001) }] }, { key: 'fixture-only', transport: response(good()) });
    assert.equal(partial.complete, false); assert.equal(determineReviewOutcome(partial), 'AI review incomplete');
    await assert.rejects(review(snapshot(), { key: 'fixture-only', transport: response({ ...good(), findings: [{ ...finding(), file: 'unreviewed.js' }] }) }), /outside/);
});

test('queue publisher creates only a generated branch and PR, never pushes main', async () => {
    const fs = require('node:fs');
    const markdown = fs.readFileSync(require('node:path').join(__dirname, '../PRIORITY_QUEUE.md'), 'utf8');
    const calls = []; let live = markdown;
    const request = async (p, method = 'GET', body) => {
        calls.push({ p, method, body });
        if (method === 'PATCH' && p.endsWith('/issues/35')) { live = body.body; return {}; }
        if (p.endsWith('/issues/35')) return { body: live };
        if (p.includes('?state=closed')) return [];
        if (p.endsWith('/git/ref/heads/main')) return { object: { sha: head } };
        if (p.endsWith('/git/ref/heads/automation/priority-queue')) throw Object.assign(Error('Not found'), { status: 404 });
        if (p.includes('/contents/')) return { content: Buffer.from('older mirror').toString('base64') };
        if (p.endsWith('/git/commits/' + head)) return { tree: { sha: base } };
        if (p.endsWith('/git/trees') || p.endsWith('/git/commits')) return { sha: blob };
        if (p.endsWith('/git/refs')) return {};
        if (p.includes('/pulls?state=open')) return [];
        if (p.endsWith('/pulls') && method === 'POST') return { html_url: 'https://github.com/example/queue-pr' };
        if (p === '/repos/Tamriel-Toolkit/ESO-Trade-Project') return { default_branch: 'main' };
        throw Error(`${method} ${p}`);
    };
    assert.equal((await publishQueue(request, 'Tamriel-Toolkit/ESO-Trade-Project')).changed, true);
    assert.equal(calls.find(c => c.p.endsWith('/git/refs')).body.ref, 'refs/heads/automation/priority-queue');
    assert.equal(calls.filter(c => c.method !== 'GET' && c.p.includes('/heads/main')).length, 0);
    const tree = calls.find(c => c.p.endsWith('/git/trees')).body.tree;
    assert.deepEqual(tree.map(x => x.path), ['.agents/PRIORITY_QUEUE.md']);
});

test('workflow wiring includes automation in the required CI gate and pins every action', () => {
    const fs = require('node:fs'), path = require('node:path');
    const root = path.join(__dirname, '../../.github/workflows');
    const ci = fs.readFileSync(path.join(root, 'ci.yml'), 'utf8');
    assert.match(ci, /\n  automation:/); assert.match(ci, /needs: \[automation, backend-and-pipeline, frontend-build\]/);
    assert.match(ci, /windows-latest/); assert.match(ci, /DB_PATH: ":memory:"/);
    for (const name of fs.readdirSync(root)) {
        const text = fs.readFileSync(path.join(root, name), 'utf8');
        for (const match of text.matchAll(/uses:\s+([^\s#]+)/g)) assert.match(match[1], /@[a-f0-9]{40}$/);
    }
    const reviewer = fs.readFileSync(path.join(root, 'agent-pr-review.yml'), 'utf8');
    assert.doesNotMatch(reviewer, /self-hosted|head\.sha|pull_request_target|dangerously/);
    assert.match(reviewer, /persist-credentials: false/);
});
