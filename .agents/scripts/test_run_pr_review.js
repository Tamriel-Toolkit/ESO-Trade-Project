const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    verifyTriggerGate,
    annotateUnifiedDiff,
    formatFindingComment,
    buildGitHubReviewPayload,
    parseAgyOutput,
} = require('./run_pr_review');

test('verifyTriggerGate enforces Review label and designated author RyanS4', () => {
    assert.equal(
        verifyTriggerGate({
            eventName: 'pull_request',
            labelName: 'Review',
            prAuthor: 'RyanS4',
            actor: 'RyanS4',
        }).allowed,
        true
    );

    // Wrong label is rejected
    const wrongLabel = verifyTriggerGate({
        eventName: 'pull_request',
        labelName: 'enhancement',
        prAuthor: 'RyanS4',
        actor: 'RyanS4',
    });
    assert.equal(wrongLabel.allowed, false);
    assert.match(wrongLabel.reason, /not "Review"/);

    // Unauthorized PR author is rejected
    const wrongAuthor = verifyTriggerGate({
        eventName: 'pull_request',
        labelName: 'Review',
        prAuthor: 'SomeOtherUser',
        actor: 'RyanS4',
    });
    assert.equal(wrongAuthor.allowed, false);
    assert.match(wrongAuthor.reason, /PR author "SomeOtherUser"/);

    // Unauthorized label actor is rejected
    const wrongActor = verifyTriggerGate({
        eventName: 'pull_request',
        labelName: 'Review',
        prAuthor: 'RyanS4',
        actor: 'SomeoneElse',
    });
    assert.equal(wrongActor.allowed, false);
    assert.match(wrongActor.reason, /actor "SomeoneElse"/);
});

test('annotateUnifiedDiff tracks exact right-side line numbers and builds individual inline comments', () => {
    const sampleDiff = [
        'diff --git a/docs/LISTING_LIFECYCLE.md b/docs/LISTING_LIFECYCLE.md',
        'index 1111111..2222222 100644',
        '--- a/docs/LISTING_LIFECYCLE.md',
        '+++ b/docs/LISTING_LIFECYCLE.md',
        '@@ -40,3 +40,4 @@',
        ' context line 40',
        '-old line 41',
        '+new line 41',
        '+new line 42',
        ' context line 43',
    ].join('\n');

    const { annotatedDiff, validLinesByFile } = annotateUnifiedDiff(sampleDiff);
    assert.match(annotatedDiff, /\[L41\] \+new line 41/);
    assert.match(annotatedDiff, /\[L42\] \+new line 42/);
    assert.deepEqual(Array.from(validLinesByFile.get('docs/LISTING_LIFECYCLE.md')), [40, 41, 42, 43]);

    const reviewResult = {
        verdict: 'REQUEST_CHANGES',
        overall_summary: 'Found two issues.',
        findings: [
            {
                severity: 'P2',
                difficulty: 'Trivial',
                file: 'docs/LISTING_LIFECYCLE.md',
                line: 42,
                title: 'Capacity calculation is off by 10x',
                description: '500 x 30 is 15,000 rather than 1,500.',
                suggested_fix: 'Update the total to 15,000 listings.',
            },
            {
                severity: 'P1',
                difficulty: 'Medium',
                file: 'other/unrelated.js',
                line: 10,
                title: 'Unanchored finding falls back to individual comment',
                description: 'Issue in a file outside the diff.',
                suggested_fix: 'Fix other/unrelated.js.',
            },
        ],
    };

    const payload = buildGitHubReviewPayload(reviewResult, validLinesByFile, 'gemini-3.8-flash-high');
    assert.equal(payload.inlineComments.length, 1);
    assert.equal(payload.inlineComments[0].path, 'docs/LISTING_LIFECYCLE.md');
    assert.equal(payload.inlineComments[0].line, 42);
    assert.match(payload.inlineComments[0].body, /- \*\*Severity:\*\* `P2 \(Medium\)`/);
    assert.match(payload.inlineComments[0].body, /- \*\*Difficulty to Fix:\*\* `Trivial`/);
    assert.match(payload.inlineComments[0].body, /- \*\*Description of Issue:\*\* 500 x 30 is 15,000/);

    assert.equal(payload.fallbackComments.length, 1);
    assert.match(payload.fallbackComments[0], /- \*\*Location:\*\* `other\/unrelated\.js:10`/);
});

test('parseAgyOutput extracts structured_output from stream-json result event', () => {
    const streamOutput = [
        JSON.stringify({ event: 'init', conversation_id: 'abc' }),
        JSON.stringify({
            event: 'result',
            result: {
                status: 'SUCCESS',
                structured_output: {
                    verdict: 'APPROVE',
                    overall_summary: 'Looks good.',
                    findings: [],
                },
            },
        }),
    ].join('\n');

    const parsed = parseAgyOutput(streamOutput);
    assert.equal(parsed.verdict, 'APPROVE');
    assert.deepEqual(parsed.findings, []);
});
