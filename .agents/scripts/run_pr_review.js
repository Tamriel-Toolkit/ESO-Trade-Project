#!/usr/bin/env node
/**
 * Agentic Pull Request Reviewer for ESO Trade Project
 *
 * Runs a standardized PR code review using Google Antigravity CLI (`agy`)
 * with `gemini-3.8-flash-high` (`--effort high`), gated on the "Review" label
 * and designated GitHub authors (default: ["RyanS4"]).
 *
 * Posts each finding as an individual GitHub PR review comment containing:
 *   - Severity (P0-P3)
 *   - Difficulty to Fix (Trivial, Low, Medium, High)
 *   - Description of Issue & Suggested Fix
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '../..');
const PROMPT_TEMPLATE_PATH = path.join(REPO_ROOT, '.agents/prompts/pr_review_prompt.md');
const SCHEMA_PATH = path.join(REPO_ROOT, '.agents/schemas/pr_review_schema.json');

const DEFAULT_MODEL = 'gemini-3.8-flash-high';
const DEFAULT_EFFORT = 'high';
const DEFAULT_ALLOWED_AUTHORS = ['RyanS4'];
const REQUIRED_LABEL = 'Review';

const SEVERITY_LABELS = {
    P0: 'P0 (Critical)',
    P1: 'P1 (High)',
    P2: 'P2 (Medium)',
    P3: 'P3 (Low)',
};

/**
 * Validates that the workflow was triggered with the "Review" label
 * and that both the PR author and triggering actor are designated authors.
 */
function verifyTriggerGate({
    eventName = process.env.GITHUB_EVENT_NAME || 'local',
    labelName = process.env.REVIEW_LABEL_NAME || '',
    prAuthor = process.env.PR_AUTHOR || '',
    actor = process.env.GITHUB_ACTOR || '',
    allowedAuthorsRaw = process.env.ALLOWED_REVIEW_AUTHORS || JSON.stringify(DEFAULT_ALLOWED_AUTHORS),
}) {
    let allowedAuthors;
    try {
        const parsed = JSON.parse(allowedAuthorsRaw);
        allowedAuthors = Array.isArray(parsed) ? parsed : DEFAULT_ALLOWED_AUTHORS;
    } catch {
        allowedAuthors = String(allowedAuthorsRaw)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
    }
    const normalizedAllowed = new Set(allowedAuthors.map(a => a.toLowerCase()));

    if (eventName === 'pull_request' || eventName === 'pull_request_target') {
        if (labelName !== REQUIRED_LABEL) {
            return {
                allowed: false,
                reason: `Skipped: applied label "${labelName}" is not "${REQUIRED_LABEL}".`,
            };
        }
    }

    if (prAuthor && !normalizedAllowed.has(prAuthor.toLowerCase())) {
        return {
            allowed: false,
            reason: `Skipped: PR author "${prAuthor}" is not in designated authors [${allowedAuthors.join(', ')}].`,
        };
    }

    if (actor && !normalizedAllowed.has(actor.toLowerCase())) {
        return {
            allowed: false,
            reason: `Skipped: actor "${actor}" is not in designated authors [${allowedAuthors.join(', ')}].`,
        };
    }

    return { allowed: true, allowedAuthors };
}

/**
 * Parses a unified git diff, annotating each right-side (+) or context line
 * with its exact 1-based file line number `[L<num>]` and recording which
 * `(file, line)` pairs are valid inline comment targets on the PR diff.
 */
function annotateUnifiedDiff(rawDiff) {
    const lines = String(rawDiff || '').split(/\r?\n/);
    const annotated = [];
    const validLinesByFile = new Map();

    let currentFile = null;
    let rightLine = null;

    for (const line of lines) {
        if (line.startsWith('diff --git ')) {
            currentFile = null;
            rightLine = null;
            annotated.push(line);
            continue;
        }
        if (line.startsWith('+++ b/')) {
            currentFile = line.slice(6).trim();
            if (!validLinesByFile.has(currentFile)) {
                validLinesByFile.set(currentFile, new Set());
            }
            annotated.push(line);
            continue;
        }
        if (line.startsWith('--- ')) {
            annotated.push(line);
            continue;
        }
        const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (hunkMatch) {
            rightLine = Number.parseInt(hunkMatch[1], 10);
            annotated.push(line);
            continue;
        }

        if (currentFile && rightLine !== null) {
            if (line.startsWith('+')) {
                validLinesByFile.get(currentFile).add(rightLine);
                annotated.push(`[L${rightLine}] ${line}`);
                rightLine += 1;
                continue;
            }
            if (line.startsWith(' ')) {
                validLinesByFile.get(currentFile).add(rightLine);
                annotated.push(`[L${rightLine}] ${line}`);
                rightLine += 1;
                continue;
            }
            if (line.startsWith('-')) {
                annotated.push(`[DEL] ${line}`);
                continue;
            }
        }
        annotated.push(line);
    }

    return {
        annotatedDiff: annotated.join('\n'),
        validLinesByFile,
    };
}

/**
 * Formats an individual finding into the standardized GitHub PR comment body.
 */
function formatFindingComment(finding, includeFileLocation = false) {
    const severityLabel = SEVERITY_LABELS[finding.severity] || finding.severity || 'P2 (Medium)';
    const difficulty = finding.difficulty || 'Low';
    const locationLine = includeFileLocation && finding.file
        ? `\n- **Location:** \`${finding.file}${finding.line ? `:${finding.line}` : ''}\``
        : '';

    return [
        `### \`[${finding.severity || 'P2'}]\` ${finding.title}`,
        `- **Severity:** \`${severityLabel}\``,
        `- **Difficulty to Fix:** \`${difficulty}\`${locationLine}`,
        `- **Description of Issue:** ${finding.description}`,
        `- **Suggested Fix:** ${finding.suggested_fix}`,
    ].join('\n');
}

/**
 * Splits findings into inline PR diff review comments and fallback top-level comments
 * if a finding references a line outside the diff hunks.
 */
function buildGitHubReviewPayload(reviewResult, validLinesByFile, model = DEFAULT_MODEL) {
    const findings = Array.isArray(reviewResult?.findings) ? reviewResult.findings : [];
    const inlineComments = [];
    const fallbackComments = [];

    for (const finding of findings) {
        const normalizedFile = String(finding.file || '').replace(/\\/g, '/').replace(/^\.\//, '');
        const lineNum = Number.parseInt(finding.line, 10);
        const fileLines = validLinesByFile.get(normalizedFile);

        if (fileLines && Number.isInteger(lineNum) && lineNum > 0 && fileLines.has(lineNum)) {
            inlineComments.push({
                path: normalizedFile,
                line: lineNum,
                side: 'RIGHT',
                body: formatFindingComment(finding, false),
            });
        } else if (fileLines && fileLines.size > 0) {
            // Anchor to the closest changed line in that file if the exact line is outside the hunk
            const sortedLines = Array.from(fileLines).sort((a, b) => a - b);
            const closestLine = Number.isInteger(lineNum)
                ? sortedLines.reduce((best, curr) => (Math.abs(curr - lineNum) < Math.abs(best - lineNum) ? curr : best), sortedLines[0])
                : sortedLines[0];
            inlineComments.push({
                path: normalizedFile,
                line: closestLine,
                side: 'RIGHT',
                body: formatFindingComment(finding, true),
            });
        } else {
            fallbackComments.push(formatFindingComment(finding, true));
        }
    }

    const summaryHeader = [
        `## Agentic PR Review (\`${model}\`)`,
        '',
        `**Verdict:** \`${reviewResult?.verdict || 'COMMENT'}\` | **Findings:** \`${findings.length}\``,
        '',
        reviewResult?.overall_summary || 'Automated review completed.',
    ].join('\n');

    return {
        summaryBody: summaryHeader,
        inlineComments,
        fallbackComments,
    };
}

/**
 * Extracts the structured review object from `agy` JSON or stream-json output.
 */
function parseAgyOutput(stdout) {
    const trimmed = String(stdout || '').trim();
    if (!trimmed) {
        throw new Error('Empty output received from agy CLI.');
    }

    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
        let parsed;
        try {
            parsed = JSON.parse(lines[i]);
        } catch {
            continue;
        }

        // stream-json terminal event: { event: "result", result: { status, structured_output, response } }
        const envelope = parsed.event === 'result' && parsed.result ? parsed.result : parsed;
        if (envelope.status && envelope.status !== 'SUCCESS') {
            throw new Error(`agy CLI returned status ${envelope.status}: ${envelope.error || 'Unknown error'}`);
        }
        if (envelope.structured_output && typeof envelope.structured_output === 'object') {
            return envelope.structured_output;
        }
        if (typeof envelope.response === 'string' && envelope.response.trim()) {
            const rawJson = envelope.response
                .trim()
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```$/, '');
            return JSON.parse(rawJson);
        }
        if (envelope.verdict && Array.isArray(envelope.findings)) {
            return envelope;
        }
    }

    throw new Error('Could not parse structured review output from agy CLI.');
}

/**
 * Resolves the `agy` executable path across Linux, macOS, and Windows.
 */
function resolveAgyBinary() {
    if (process.env.AGY_BIN && fs.existsSync(process.env.AGY_BIN)) {
        return process.env.AGY_BIN;
    }
    const candidates = process.platform === 'win32'
        ? [
            path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData/Local'), 'agy/bin/agy.exe'),
            'agy.exe',
            'agy',
        ]
        : [
            path.join(os.homedir(), '.local/bin/agy'),
            '/usr/local/bin/agy',
            'agy',
        ];

    for (const candidate of candidates) {
        if (candidate.includes(path.sep) && fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return candidates[candidates.length - 1];
}

/**
 * Executes the review prompt through `agy` using stream-json stdin so arbitrarily
 * large diffs work on both Windows and Linux without hitting OS argv limits.
 */
function runAgyReview(prompt, {
    model = process.env.AGY_MODEL || DEFAULT_MODEL,
    effort = process.env.AGY_EFFORT || DEFAULT_EFFORT,
    schemaPath = SCHEMA_PATH,
    timeoutMs = 10 * 60 * 1000,
} = {}) {
    const agyBin = resolveAgyBinary();
    const args = [
        '--input-format', 'stream-json',
        '--output-format', 'stream-json',
        '--model', model,
        '--effort', effort,
        '--disable-slash-commands',
        '--json-schema', schemaPath,
        '--print-timeout', '10m',
    ];

    const stdinPayload = JSON.stringify({
        event: 'user',
        message: { content: prompt },
    }) + '\n';

    const result = spawnSync(agyBin, args, {
        cwd: REPO_ROOT,
        input: stdinPayload,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: timeoutMs,
    });

    if (result.error) {
        throw new Error(`Failed to execute agy (${agyBin}): ${result.error.message}`);
    }
    if (result.status !== 0) {
        throw new Error(`agy exited with code ${result.status}: ${result.stderr || result.stdout}`);
    }

    return parseAgyOutput(result.stdout);
}

async function githubRequest(url, { method = 'GET', token, body, accept = 'application/vnd.github+json' } = {}) {
    const headers = {
        Accept: accept,
        'User-Agent': 'ESO-Trade-Project-Agentic-Reviewer',
        'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`GitHub API ${method} ${url} failed (${response.status}): ${text}`);
    }
    if (accept.includes('diff')) {
        return response.text();
    }
    if (response.status === 204) return null;
    return response.json();
}

function extractLinkedIssueNumbers(text) {
    const matches = String(text || '').matchAll(/#(\d+)\b/g);
    return Array.from(new Set(Array.from(matches, m => Number.parseInt(m[1], 10)).filter(n => n > 0)));
}

function renderPromptTemplate(template, replacements) {
    let output = template;
    for (const [key, value] of Object.entries(replacements)) {
        output = output.split(`{{${key}}}`).join(String(value ?? ''));
    }
    return output;
}

async function main() {
    const prNumber = Number.parseInt(process.env.PR_NUMBER || process.argv[2] || '', 10);
    const repo = process.env.GITHUB_REPOSITORY || 'Tamriel-Toolkit/ESO-Trade-Project';
    const token = process.env.GITHUB_TOKEN || '';
    const dryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');

    if (!Number.isInteger(prNumber) || prNumber <= 0) {
        throw new Error('Usage: node .agents/scripts/run_pr_review.js <PR_NUMBER> [--dry-run]');
    }

    const apiBase = `https://api.github.com/repos/${repo}`;
    const pr = await githubRequest(`${apiBase}/pulls/${prNumber}`, { token });

    const gate = verifyTriggerGate({
        eventName: process.env.GITHUB_EVENT_NAME || 'local',
        labelName: process.env.REVIEW_LABEL_NAME || REQUIRED_LABEL,
        prAuthor: process.env.PR_AUTHOR || pr.user?.login || '',
        actor: process.env.GITHUB_ACTOR || pr.user?.login || '',
    });

    if (!gate.allowed) {
        console.log(gate.reason);
        return;
    }

    const rawDiff = await githubRequest(`${apiBase}/pulls/${prNumber}`, {
        token,
        accept: 'application/vnd.github.v3.diff',
    });
    const { annotatedDiff, validLinesByFile } = annotateUnifiedDiff(rawDiff);

    // Collect changed files content from the local workspace
    const changedFilesSections = [];
    for (const relPath of validLinesByFile.keys()) {
        const absPath = path.join(REPO_ROOT, relPath);
        if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
            const content = fs.readFileSync(absPath, 'utf8');
            const numbered = content
                .split(/\r?\n/)
                .map((line, idx) => `${idx + 1}: ${line}`)
                .join('\n');
            changedFilesSections.push(`### File: \`${relPath}\`\n\`\`\`\n${numbered.slice(0, 25000)}\n\`\`\``);
        }
    }

    // Fetch linked issues context
    const issueNums = extractLinkedIssueNumbers(`${pr.title}\n${pr.body || ''}`).slice(0, 5);
    const linkedIssuesSections = [];
    for (const issueNum of issueNums) {
        if (issueNum === prNumber) continue;
        try {
            const issue = await githubRequest(`${apiBase}/issues/${issueNum}`, { token });
            linkedIssuesSections.push(`- **Issue #${issue.number}: ${issue.title}**\n${issue.body || '(No body)'}`);
        } catch {
            // Ignore unreachable issue references
        }
    }

    const template = fs.readFileSync(PROMPT_TEMPLATE_PATH, 'utf8');
    const prompt = renderPromptTemplate(template, {
        PR_NUMBER: pr.number,
        PR_AUTHOR: pr.user?.login || 'unknown',
        PR_TITLE: pr.title,
        PR_BODY: pr.body || '(No description provided)',
        LINKED_ISSUES_CONTEXT: linkedIssuesSections.length > 0 ? linkedIssuesSections.join('\n\n') : 'None linked.',
        ANNOTATED_DIFF: annotatedDiff.slice(0, 120000),
        CHANGED_FILES_CONTENT: changedFilesSections.join('\n\n').slice(0, 120000),
    });

    const model = process.env.AGY_MODEL || DEFAULT_MODEL;
    console.log(`Running agentic review for PR #${pr.number} using model "${model}" (effort: high)...`);
    const reviewResult = runAgyReview(prompt, { model });
    const payload = buildGitHubReviewPayload(reviewResult, validLinesByFile, model);

    if (dryRun || !token) {
        console.log(JSON.stringify({ reviewResult, payload }, null, 2));
        return;
    }

    // Post the PR Review with individual inline comments per finding
    await githubRequest(`${apiBase}/pulls/${prNumber}/reviews`, {
        method: 'POST',
        token,
        body: {
            commit_id: pr.head.sha,
            body: payload.summaryBody,
            event: 'COMMENT',
            comments: payload.inlineComments,
        },
    });

    // Post any findings that could not be anchored to a diff file as individual PR comments
    for (const commentBody of payload.fallbackComments) {
        await githubRequest(`${apiBase}/issues/${prNumber}/comments`, {
            method: 'POST',
            token,
            body: { body: commentBody },
        });
    }

    // Remove the "Review" trigger label so re-applying it later can trigger a fresh review
    if (process.env.REMOVE_REVIEW_LABEL !== 'false') {
        try {
            await githubRequest(`${apiBase}/issues/${prNumber}/labels/${encodeURIComponent(REQUIRED_LABEL)}`, {
                method: 'DELETE',
                token,
            });
        } catch {
            // Ignore if label was already removed
        }
    }

    console.log(
        `Posted PR #${prNumber} review with ${payload.inlineComments.length} inline comment(s) and ${payload.fallbackComments.length} general comment(s).`
    );
}

if (require.main === module) {
    main().catch(err => {
        console.error(err.message || err);
        process.exit(1);
    });
}

module.exports = {
    verifyTriggerGate,
    annotateUnifiedDiff,
    formatFindingComment,
    buildGitHubReviewPayload,
    parseAgyOutput,
    renderPromptTemplate,
};
