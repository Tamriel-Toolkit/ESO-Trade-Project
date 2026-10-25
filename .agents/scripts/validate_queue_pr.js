#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const { createGitHubClient, pages } = require('./github_api');
const { validateMirrorChanges, validateQueue } = require('./publish_queue');
const { fetchClosedIssues } = require('./sync_priority_queue');
(async () => {
    const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const pr = event.pull_request;
    if (!pr || pr.head.ref !== 'automation/priority-queue') throw new Error('Expected queue PR');
    const request = createGitHubClient();
    const api = `/repos/${process.env.GITHUB_REPOSITORY}`;
    validateMirrorChanges(await pages(request, `${api}/pulls/${pr.number}/files`));
    validateQueue(fs.readFileSync('.agents/PRIORITY_QUEUE.md', 'utf8'), await fetchClosedIssues(request, true));
    console.log('Generated mirror boundary and closed-issue checks passed.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
