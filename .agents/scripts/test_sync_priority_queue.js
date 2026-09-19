#!/usr/bin/env node

/**
 * test_sync_priority_queue.js
 * 
 * Unit and integration tests for priority queue synchronization,
 * idempotency, conflict detection, and markdown reconciliation.
 */

const assert = require('assert');
const {
    parseMatrixTable,
    parseRecentlyCompleted,
    updateQueueState,
    extractClosingKeywords,
    reconcileMarkdown
} = require('./sync_priority_queue');

function runTests() {
    console.log('[TEST] Running priority queue synchronization test suite...\n');
    let passed = 0;

    // Test 1: extractClosingKeywords
    {
        const text = 'This PR fixes #111, closes #115 and resolves #78. Also mentions #99 without keyword.';
        const keywords = extractClosingKeywords(text);
        assert.deepStrictEqual(keywords, [111, 115, 78], 'Failed to extract exact closing keywords');
        console.log('✓ Test 1: extractClosingKeywords correctly identifies closing issue numbers.');
        passed++;
    }

    // Sample markdown fixture
    const sampleMarkdown = `# 📌 ESO Trade Project — Central Agent Task & Issue Execution Queue

> **Live Status**: Canonical Roadmap & Priority Matrix  
> **Master Tracking Issue on GitHub (Live Single Source of Truth)**: [Issue #35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35)  
> **Repository Rules**: [.agents/AGENTS.md](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/AGENTS.md)  
> **Last Evaluated**: 2026-09-01

This living document provides the prioritized execution queue.

---

## 🚦 Live Execution Matrix

| Rank | Issue | Area | Severity | Status | Blocked By | Strategic Rationale |
|:---:|:---|:---|:---:|:---:|:---:|:---|
| **1** | #101 | Core | HIGH | 🟡 Next Up | None | First item. |
| **2** | #102 | Addon | MODERATE | ⚪ Queued | None | Second item. |
| **3** | #103 | Backend | MINOR | 🔴 Blocked | #101 | Blocked by 101. |

---

## 🏆 Recently Completed / Merged
- **\`#100\`** — \`Initial Setup\` (Closed/Merged)

---

## 🤖 Rules for Agents
Rules here.
`;

    // Test 2: parseMatrixTable and parseRecentlyCompleted
    {
        const table = parseMatrixTable(sampleMarkdown);
        assert.strictEqual(table.length, 3, 'Expected 3 rows in matrix table');
        assert.strictEqual(table[0].issueNum, 101);
        assert.strictEqual(table[2].blockedBy, '#101');

        const completed = parseRecentlyCompleted(sampleMarkdown);
        assert.strictEqual(completed.length, 1);
        assert.ok(completed[0].includes('#100'));
        console.log('✓ Test 2: parseMatrixTable and parseRecentlyCompleted parse tables accurately.');
        passed++;
    }

    // Test 3: updateQueueState with closed issue and blocker resolution
    {
        const table = parseMatrixTable(sampleMarkdown);
        const completed = parseRecentlyCompleted(sampleMarkdown);
        const closedMap = new Map();
        closedMap.set(101, { number: 101, title: 'Item 101 Complete', state: 'closed' });

        const { activeRows, completedList } = updateQueueState(table, completed, closedMap);
        assert.strictEqual(activeRows.length, 2, 'Active rows should now have 2 items');
        assert.strictEqual(completedList.length, 2, 'Completed list should now have 2 items');
        
        // Item #103 should now be unblocked because #101 is closed
        const item103 = activeRows.find(r => r.issueNum === 103);
        assert.ok(item103, 'Item 103 should be active');
        assert.strictEqual(item103.blockedBy, 'None', 'Item 103 should be unblocked');

        // Exactly one item should be Next Up
        const nextUpCount = activeRows.filter(r => r.status.includes('Next Up')).length;
        assert.strictEqual(nextUpCount, 1, 'Exactly one item should be Next Up');
        assert.strictEqual(activeRows[0].status, '🟡 Next Up', 'First active item should be Next Up');
        console.log('✓ Test 3: updateQueueState unblocks dependent issues and assigns Next Up correctly.');
        passed++;
    }

    // Test 4: Idempotency (reconcileMarkdown on unchanged state)
    {
        const closedMap = new Map();
        // Nothing new closed
        const reconciled = reconcileMarkdown(sampleMarkdown, closedMap);
        assert.strictEqual(reconciled, sampleMarkdown, 'Reconciliation without changes must be byte-identical');
        console.log('✓ Test 4: reconcileMarkdown is strictly idempotent when no changes are present.');
        passed++;
    }

    // Test 5: Reconcile with new closure updates Last Evaluated and appends completed
    {
        const closedMap = new Map();
        closedMap.set(101, { number: 101, title: 'First item closed', state: 'closed' });
        const reconciled = reconcileMarkdown(sampleMarkdown, closedMap);
        assert.notStrictEqual(reconciled, sampleMarkdown, 'Reconciliation with new closure must update markdown');
        assert.ok(reconciled.includes('#101'), 'Reconciled markdown must include closed issue in archive');
        assert.ok(!reconciled.includes('| **1** | #101 |'), 'Closed issue must be removed from active matrix');
        console.log('✓ Test 5: reconcileMarkdown updates matrix and archive cleanly.');
        passed++;
    }

    console.log(`\n[SUCCESS] All ${passed} tests passed!`);
}

if (require.main === module) {
    try {
        runTests();
    } catch (err) {
        console.error('\n[FAIL] Test suite failed:', err);
        process.exit(1);
    }
}

module.exports = { runTests };
