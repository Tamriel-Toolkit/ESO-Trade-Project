#!/usr/bin/env node

/**
 * sync_priority_queue.js
 * 
 * Automatically synchronizes Master Tracking Issue #35 and .agents/PRIORITY_QUEUE.md
 * when Pull Requests are merged or GitHub Issues are closed.
 * 
 * Zero external dependencies (uses native Node.js 18+ fetch).
 */

const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'Tamriel-Toolkit/ESO-Trade-Project';
const [REPO_OWNER, REPO_NAME] = GITHUB_REPOSITORY.split('/');
const TRACKING_ISSUE_NUM = parseInt(process.env.TRACKING_ISSUE_NUMBER || '35', 10);
const LOCAL_QUEUE_FILE = path.join(__dirname, '..', 'PRIORITY_QUEUE.md');

const isDryRun = process.argv.includes('--dry-run');
const localFileOnly = process.argv.includes('--local-file-only');

async function githubRequest(endpoint, method = 'GET', body = null) {
    if (!GITHUB_TOKEN) {
        throw new Error('GITHUB_TOKEN environment variable is required to interact with GitHub API.');
    }

    const url = `https://api.github.com${endpoint}`;
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ESO-Trade-Priority-Queue-Sync',
        'Authorization': `Bearer ${GITHUB_TOKEN}`
    };

    if (body) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`GitHub API error ${res.status} on ${method} ${endpoint}: ${errorText}`);
    }

    return res.json();
}

/**
 * Fetch all closed issues in the repository
 */
async function fetchClosedIssues() {
    if (!GITHUB_TOKEN) {
        console.warn('[WARN] No GITHUB_TOKEN provided; skipping remote closed issue fetch.');
        return new Map();
    }

    try {
        const closedIssues = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=closed&per_page=100`);
        const closedMap = new Map();
        for (const issue of closedIssues) {
            // Exclude pull requests if any returned by issues endpoint
            closedMap.set(issue.number, {
                number: issue.number,
                title: issue.title,
                state: issue.state,
                closed_at: issue.closed_at,
                pull_request: issue.pull_request || null
            });
        }
        return closedMap;
    } catch (err) {
        console.error('[ERROR] Failed to fetch closed issues:', err.message);
        return new Map();
    }
}

/**
 * Fetch Master Tracking Issue body
 */
async function fetchTrackingIssueBody() {
    if (!GITHUB_TOKEN) {
        console.log('[INFO] Reading local PRIORITY_QUEUE.md since GITHUB_TOKEN is not set.');
        return fs.readFileSync(LOCAL_QUEUE_FILE, 'utf-8');
    }

    try {
        const issue = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${TRACKING_ISSUE_NUM}`);
        return issue.body;
    } catch (err) {
        console.warn(`[WARN] Failed to fetch Issue #${TRACKING_ISSUE_NUM} from GitHub (${err.message}). Falling back to local file.`);
        return fs.readFileSync(LOCAL_QUEUE_FILE, 'utf-8');
    }
}

/**
 * Parse Markdown matrix table into structured objects
 */
function parseMatrixTable(markdown) {
    const lines = markdown.split('\n');
    const tableRows = [];
    let inTable = false;
    let tableHeaderFound = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('| Rank |') || line.startsWith('| **Rank** |')) {
            inTable = true;
            tableHeaderFound = true;
            continue;
        }
        if (inTable && line.startsWith('|:---') || (inTable && line.startsWith('|---'))) {
            continue;
        }
        if (inTable && line.startsWith('|') && line.endsWith('|')) {
            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            if (cells.length >= 7) {
                tableRows.push({
                    rawLine: line,
                    rankStr: cells[0],
                    issueRaw: cells[1],
                    issueNum: parseInt((cells[1].match(/\d+/) || [])[0] || '0', 10),
                    area: cells[2],
                    severity: cells[3],
                    status: cells[4],
                    blockedBy: cells[5],
                    rationale: cells[6]
                });
            }
        } else if (inTable && !line.startsWith('|') && line.length > 0) {
            inTable = false;
        }
    }

    return tableRows;
}

/**
 * Parse Recently Completed section
 */
function parseRecentlyCompleted(markdown) {
    const lines = markdown.split('\n');
    const completedItems = [];
    let inCompleted = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('Recently Completed') || line.includes('🏆 Recently Completed')) {
            inCompleted = true;
            continue;
        }
        if (inCompleted && line.startsWith('## ') || (inCompleted && line.startsWith('---') && lines[i + 1]?.trim().startsWith('## '))) {
            inCompleted = false;
            continue;
        }
        if (inCompleted && (line.startsWith('- **#') || line.startsWith('- **`#'))) {
            completedItems.push(line);
        }
    }

    return completedItems;
}

/**
 * Process queue updates based on closed issues
 */
function updateQueueState(tableRows, completedList, closedIssuesMap) {
    const activeRows = [];
    const newlyCompletedRows = [];

    // 1. Identify closed issues vs active issues
    for (const row of tableRows) {
        const isClosed = closedIssuesMap.has(row.issueNum);
        if (isClosed) {
            newlyCompletedRows.push(row);
        } else {
            activeRows.push(row);
        }
    }

    // 2. Add newly completed rows to completed list
    for (const row of newlyCompletedRows) {
        const closedInfo = closedIssuesMap.get(row.issueNum);
        const title = closedInfo?.title || row.rationale;
        const entry = `- **\`#${row.issueNum}\`** — \`${title}\` (Resolved)`;
        if (!completedList.some(item => item.includes(`#${row.issueNum}`) || item.includes(`\`#${row.issueNum}\``))) {
            completedList.unshift(entry);
        }
    }

    // Set of all closed issue numbers for blocker resolution
    const allClosedNumbers = new Set(closedIssuesMap.keys());

    // 3. Re-evaluate Blocked By for remaining active rows
    for (const row of activeRows) {
        if (row.blockedBy && row.blockedBy !== 'None' && row.blockedBy !== 'none') {
            const rawBlockerMatches = row.blockedBy.match(/#?\d+/g) || [];
            const remainingBlockers = rawBlockerMatches
                .map(m => parseInt(m.replace('#', ''), 10))
                .filter(num => !allClosedNumbers.has(num));

            if (remainingBlockers.length === 0) {
                row.blockedBy = 'None';
                // If it was blocked, unblock it to Queued
                if (row.status.includes('Blocked') || row.status.includes('🔴')) {
                    row.status = '⚪ Queued';
                }
            } else {
                row.blockedBy = remainingBlockers.map(n => `#${n}`).join(', ');
                row.status = '🔴 Blocked';
            }
        }
    }

    // 4. Ensure exactly ONE unblocked item is marked 🟡 Next Up
    const hasNextUp = activeRows.some(r => r.status.includes('Next Up') || r.status.includes('🟡'));
    if (!hasNextUp) {
        // Find the first unblocked row (status ⚪ Queued and Blocked By None)
        const nextCandidate = activeRows.find(r => (r.status.includes('Queued') || r.status.includes('⚪')) && r.blockedBy === 'None');
        if (nextCandidate) {
            nextCandidate.status = '🟡 Next Up';
        }
    }

    // 5. Re-assign Ranks (1, 2, 3...)
    let currentRank = 1;
    for (const row of activeRows) {
        if (row.status.includes('In Review') || row.status.includes('🟢')) {
            row.rankStr = '—';
        } else {
            row.rankStr = `**${currentRank}**`;
            currentRank++;
        }
    }

    return { activeRows, completedList };
}

/**
 * Reconstruct clean Markdown document
 */
function renderMarkdown(activeRows, completedList) {
    let output = `# 📌 ESO Trade Project — Central Agent Task & Issue Execution Queue

> **Live Status**: Canonical Roadmap & Priority Matrix  
> **Master Tracking Issue on GitHub (Live Single Source of Truth)**: [Issue #${TRACKING_ISSUE_NUM}](https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/${TRACKING_ISSUE_NUM})  
> **Repository Rules**: [.agents/AGENTS.md](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/AGENTS.md)  
> **Last Evaluated**: ${new Date().toISOString().split('T')[0]}  

This living document provides the prioritized execution queue for both human maintainers and autonomous AI agents. Whenever an issue is created or resolved, GitHub Issue #${TRACKING_ISSUE_NUM} (the live runtime SSOT) and this document are updated.

---

## 🚦 Status Legend (Strict Single WIP Policy)

| Status | Meaning | Permitted Count | Action Required |
|:---:|:---|:---:|:---|
| \`🟡 Next Up\` | **Active Work Item** (Rank #1) | **Exactly 1** | The only task an agent should pick when starting work. |
| \`⚪ Queued\` | Unblocked & ready in backlog | Multiple | Waiting in sequence behind Rank #1. |
| \`🔴 Blocked\` | Blocked by a prerequisite issue | Multiple | Do NOT start until prerequisite issue is resolved. |
| \`🟢 In Review (PR #X)\` | Implementation complete, PR open | Multiple | Waiting for maintainer review & merge. |
| \`✅ Closed\` | Merged and resolved | Multiple | Archived in Recently Completed. |

---

## 🚦 Live Execution Matrix

| Rank | Issue | Area | Severity | Status | Blocked By | Strategic Rationale |
|:---:|:---|:---|:---:|:---:|:---:|:---|
`;

    for (const r of activeRows) {
        const issueFormatted = r.issueRaw.startsWith('`') || r.issueRaw.startsWith('#') ? r.issueRaw : `#${r.issueNum}`;
        output += `| ${r.rankStr} | ${issueFormatted} | ${r.area} | ${r.severity} | ${r.status} | ${r.blockedBy} | ${r.rationale} |\n`;
    }

    output += `
---

## 🏆 Recently Completed / Merged
`;

    for (const c of completedList) {
        output += `${c}\n`;
    }

    output += `
---

## 🤖 Rules for Agents
1. When asked to **"work on the next task"** or **"start top of the queue"**, **always fetch [Master Tracking Issue #${TRACKING_ISSUE_NUM}](https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/${TRACKING_ISSUE_NUM}) via \`issue_read\`**.
2. Locate the single item marked **\`🟡 Next Up\`** (Rank #1) and confirm no **Blocked By** prerequisite issues remain open.
3. Follow the issue resolution workflow in [\`.agents/skills/eso-trade-issue-implementer/SKILL.md\`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/skills/eso-trade-issue-implementer/SKILL.md).
4. Upon opening a Draft PR:
   - Update Master Tracking Issue #${TRACKING_ISSUE_NUM} on GitHub (mark completed item as \`🟢 In Review (PR #X)\` and promote next unblocked item to \`🟡 Next Up\`).
   - Any items with unmerged prerequisites (\`Blocked By\`) MUST remain or be marked \`🔴 Blocked\`.
   - Do NOT edit \`.agents/PRIORITY_QUEUE.md\` inside feature branches (avoids merge conflicts).
`;

    return output;
}

/**
 * Main Execution Function
 */
async function main() {
    console.log(`[SYNC] Starting Priority Queue Synchronization for ${REPO_OWNER}/${REPO_NAME}...`);

    const markdownBody = await fetchTrackingIssueBody();
    const closedIssuesMap = await fetchClosedIssues();

    // Check if explicit closed issues were passed as CLI flags (e.g. from GitHub Actions PR merge context)
    const closedArgIdx = process.argv.indexOf('--closed-issues');
    if (closedArgIdx !== -1 && process.argv[closedArgIdx + 1]) {
        const explicitNums = process.argv[closedArgIdx + 1].split(',').map(n => parseInt(n.trim(), 10));
        for (const num of explicitNums) {
            if (num && !closedIssuesMap.has(num)) {
                closedIssuesMap.set(num, { number: num, title: `Issue #${num}`, state: 'closed' });
            }
        }
    }

    console.log(`[SYNC] Found ${closedIssuesMap.size} closed issue(s).`);

    const tableRows = parseMatrixTable(markdownBody);
    const completedList = parseRecentlyCompleted(markdownBody);

    console.log(`[SYNC] Parsed ${tableRows.length} matrix rows and ${completedList.length} completed archive entries.`);

    const { activeRows, completedList: updatedCompleted } = updateQueueState(tableRows, completedList, closedIssuesMap);

    const updatedMarkdown = renderMarkdown(activeRows, updatedCompleted);

    if (isDryRun) {
        console.log('\n[DRY RUN] Generated Markdown:\n');
        console.log(updatedMarkdown);
        return;
    }

    // Write to local file
    fs.writeFileSync(LOCAL_QUEUE_FILE, updatedMarkdown, 'utf-8');
    console.log(`[SYNC] Updated local file: ${LOCAL_QUEUE_FILE}`);

    // Write to GitHub Tracking Issue if token is provided and not local-only
    if (GITHUB_TOKEN && !localFileOnly) {
        console.log(`[SYNC] Updating Master Tracking Issue #${TRACKING_ISSUE_NUM} on GitHub...`);
        await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${TRACKING_ISSUE_NUM}`, 'PATCH', {
            body: updatedMarkdown
        });
        console.log(`[SYNC] Successfully synchronized GitHub Tracking Issue #${TRACKING_ISSUE_NUM}!`);
    }
}

if (require.main === module) {
    main().catch(err => {
        console.error('[ERROR] Priority Queue Synchronization failed:', err);
        process.exit(1);
    });
}

module.exports = {
    parseMatrixTable,
    parseRecentlyCompleted,
    updateQueueState,
    renderMarkdown
};
