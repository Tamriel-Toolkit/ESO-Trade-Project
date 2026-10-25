# GitHub governance and automation

## Roles and main protection

The organization owner retains administration. Organization base access is Read; outsiders submit fork PRs. Moderators use Triage and cannot bypass main protection. Developers use Write; Maintainers use Maintain only when technical responsibility is delegated. The developer and maintainer teams start empty.

`Main: PR, CI and history` requires a PR, the GitHub Actions **CI Status Gate**, an up-to-date branch, resolved conversations and linear history. Force pushes/deletion are prohibited and there are no bypass actors. Squash merge and automatic merged-branch deletion keep history simple.

Solo operation uses zero required human approvals because authors cannot approve their own PRs. **Before adding anyone with Write or Maintain access**, activate `Human review: enable before adding writers`, require one technical/code-owner approval, and update CODEOWNERS to active technical maintainers. Its owner-only exception is limited to PR merges and does not bypass the separate CI/history rules. Do not assign moderation teams to either approval or bypass lists.

Repository creation, visibility changes, deletion and transfer are owner-controlled. Organization 2FA, secret-scanning alerts, push protection and dependency security updates are enabled. The stronger non-SMS-only 2FA policy needs the owner to migrate away from SMS first. GitHub Free does not expose the organization-wide outside-collaborator invitation restriction (that requires Enterprise Cloud); keep repository Admin access with the owner so the assigned Triage/Write/Maintain roles cannot invite collaborators. See [GitHub invitation policy](https://docs.github.com/en/enterprise-cloud%40latest/organizations/managing-organization-settings/setting-permissions-for-adding-outside-collaborators).

## Requesting AI review

Comment exactly `/review` on an open PR, or run **Agentic PR Review** from the default branch with its PR number. The requester needs Write, Maintain or Admin. Any PR author, including a first-time fork contributor, is supported. Moderator Triage access does not grant permission to spend review API quota. Requests from other refs or unauthorized users fail before model access.

The workflow has three jobs:

1. Trusted default-branch code authorizes the requester and fetches immutable base/head comparison and Git blobs through GitHub's API. PR files are never checked out or executed. Symlinks remain blob text, never local file reads.
2. A hosted job sends bounded context to Gemini with a structural output schema; local validation enforces string, numeric and finding-count limits because bounded provider schemas can be rejected as too complex. It has no GitHub write token and no model tools. Only `GEMINI_API_KEY` is supplied to the model-call process; do not use personal desktop credentials or a general-purpose agent CLI.
3. A separate publisher validates output, rechecks revisions and posts advisory comments. It has no model key. It never approves or merges a PR.

Set repository Actions secret `GEMINI_API_KEY`. Optional repository variable `REVIEW_MODEL` defaults to `gemini-3.8-flash`, the API model ID rather than the old CLI's `-high` alias. Model cost is bounded to eight sequential chunks per request, roughly 90,000 source characters per chunk and 12,000 output tokens per call. Maximum file context is 60,000 characters including patch and metadata. Oversized/binary/unavailable files, budget limits and comparison truncation are explicitly reported as incomplete. Reduce PR size or inspect uncovered files manually. Review artifacts expire after one day; do not place secrets in PR content.

Output states:

- **AI review complete**: all supported text changes within budget were analyzed; not approval or a claim that tests passed.
- **AI findings**: actionable findings exist. P0/P1 are recommendations to resolve before merge; P2/P3 are advisory. Human maintainers decide.
- **AI review incomplete**: provider failure, invalid output or coverage limit. Never interpret as clean.
- **AI review stale**: base/head revision changed. Request another review.

One bot summary is updated. Inline comments are anchored only to exact valid diff lines and deduplicated for the same commit/location/title. Off-diff findings stay in the summary rather than being moved to unrelated lines. The metadata-only freshness workflow runs when CI is requested/completed for PRs or main pushes, rechecks open PR revisions, and never consumes upstream artifacts or PR code. Publication independently rechecks freshness. Automatic model reruns remain off to avoid surprise costs; `/review` is explicit enrollment for one revision.

Actions are pinned to immutable commits; Dependabot proposes updates. The model API has no tool access even if PR text attempts prompt injection. The old desktop runner registration has been removed; these workflows use hosted runners.

## Roadmap publication

Issue #35 is authoritative. On changes to #35, issue closure/reopening, main pushes, a daily reconciliation or manual dispatch, the publisher fetches closed issues and merged PRs, reconciles the live matrix and updates one branch: `automation/priority-queue`. It creates or updates a single mirror PR changing only `.agents/PRIORITY_QUEUE.md`. The live issue can be newer than the mirror while that PR awaits merge.

The publisher validates the generated branch before replacing it and refuses non-mirror changes. CI checks that mirror PRs contain only the expected file, one Next Up and no completed issues in the active matrix. No direct pushes to main, broad bypass grants, or `[skip ci]` commits are used.

GitHub must permit Actions to create PRs for the default `GITHUB_TOKEN` path. This setting also permits review approval at the platform level, but neither workflow issues approval events. Bot-created PR workflows may require clicking **Approve and run**; merge only after CI passes. If organization policy forbids that setting, supply `QUEUE_PR_TOKEN` from a narrowly scoped GitHub App/token with contents and pull-request write plus issues read/write for this repository. Do not grant branch bypass. For automatic App token rotation, add a dedicated App-token step rather than storing an expiring installation token as a long-lived secret.

## Failure recovery

- Missing key/quota/model access: review reports incomplete; correct the secret/provider configuration and request `/review` again.
- Changed PR revision: rerun; an earlier review never authorizes a later head.
- Bot PR creation blocked: check organization and repository Actions policies; do not weaken main rules.
- Concurrent main/roadmap changes: manually rerun Sync Priority Queue; its next scheduled run also reconciles current state.
- Generated branch contains unexpected files: inspect it before cleanup; the publisher intentionally refuses to overwrite them.

## Verification

Run `node --test .agents/scripts/test_*.js` from the repository root. CI runs automation regressions on Linux and Windows and includes them in CI Status Gate. Application suites run separately. Until #163 removes password-test startup side effects, CI uses an explicit in-memory database to avoid configured storage; this is not a replacement for #163's full isolation work.
