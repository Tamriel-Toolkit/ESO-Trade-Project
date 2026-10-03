---
name: eso-trade-issue-reviewer
description: >-
  Review a specified GitHub issue or the next roadmap issue for ESO-Trade-Project.
  Build implementation-ready context, assess urgency, scope, necessity, and impact,
  and present a six-column decision table with 1–3 implementation options and one
  recommendation. Wait for the user's response before implementation or GitHub changes.
  Applies to requests such as "review issue #X", "review the next issue", and
  "review the current issue in the queue".
---

# ESO Trade Project — Issue Review Before Implementation

Prepare a grounded review as though you will implement the selected approach
immediately after the user responds. Understand the current application, trace the
issue through the relevant code, and give the user a concrete decision to make.
The review itself ends with the assessment table and a pause; anticipated follow-up
work does not authorize implementation.

## Resolve the issue and current state

- For an explicit issue number or URL, read that issue's full body, acceptance
  criteria, relevant discussion, and linked pull requests.
- For "next issue" or "current issue in the queue", read the live master roadmap,
  [Issue #35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35), and select
  the single item marked `🟡 Next Up`. This live issue is authoritative; do not select
  work from a stale local `.agents/PRIORITY_QUEUE.md` snapshot or conversation memory.
- Use the repository's current remote to resolve its owner/name. Prefer an available
  GitHub connector or CLI; an older owner name in documentation is not authoritative.
- Confirm the issue's current open/closed state, blockers, and related PR status.
  Distinguish proposed work, draft implementation, and code actually merged.
- If the roadmap is unavailable or has multiple Next Up items, state the limitation
  and ask the user to identify the target. Do not invent a queue selection. Continue
  any useful context inspection that does not depend on that selection.

## Build context for the expected implementation

Read `.agents/AGENTS.md` and any applicable repository instructions. Inspect the
current branch, working-tree changes, and relevant differences from the default
branch so conclusions identify which version of the code they describe.

Develop enough understanding to explain:

- What the application is trying to accomplish, who benefits from this issue, and
  how it fits the current product rather than only the issue author's original plan.
- The current behavior, intended behavior, and evidence for the gap. Trace the
  relevant path through UI, API, storage, ingestion, addon, or automation as applicable.
- The likely root cause or missing capability, affected files, existing patterns
  worth reusing, and tests that already cover or fail to cover the behavior.
- Existing work that changes the decision: merged fixes, open PRs, duplicate issues,
  partial implementations, blockers, and outdated acceptance criteria.
- What the recommended implementation would change, how to verify it, and any
  required migration, configuration, deployment, or permission decision.

Keep inspection proportional to the issue; do not turn every review into a full
repository audit. Use source code and current issue/PR evidence to support claims.
Separate verified findings from assumptions and identify missing evidence plainly.
Safe diagnostic checks are allowed when useful; avoid commands that mutate the
user's databases or application state during review.

Preserve the project's core constraints when evaluating options: authentic native
addon listings, discoverable active listings, official ESO addon APIs, the UESP
catalog and set/icon metadata pipeline, and backend-cached icon delivery. Verify
current architecture in code rather than copying stale technical summaries.

## Make the decision concrete

Assess these six dimensions for each reviewed issue:

1. **Issue and title:** Link the issue number and use its current title. Note whether
   it is open, closed, already implemented, or partially implemented when relevant.
2. **Urgency:** Choose `Critical`, `High`, `Medium`, or `Low`, with a concise reason
   based on present security/data risk, user impact, dependencies, and timing. Assess
   independently of the current roadmap rank. Mention any warranted order change.
3. **Keep issue / refine scope:** Choose `KEEP`, `REFINE`, or `REMOVE`. Justify it.
   For `REFINE`, specify concrete scope or acceptance-criteria changes, including
   what should be excluded or split out. `REMOVE` means recommend retiring the issue,
   not deleting its history or taking action now.
4. **Proposed implementations:** Give **1–3 concrete, distinct options**, each with
   its mechanism and meaningful tradeoff. Mark **exactly one** as
   `**(Recommended)**`. Favor the smallest reliable approach that meets the current
   need; do not pad the list with implausible alternatives. If closure is warranted,
   give an evidence-backed closure/verification option rather than inventing code work.
5. **Continue or close:** Recommend `CONTINUE` or `CLOSE`, with a reason. If continuing
   depends on another issue, use `CONTINUE — blocked by #X` and explain the prerequisite.
   For closure, distinguish completed, duplicate, obsolete, or not planned. These are
   recommendations only, not issue state changes.
6. **Impact:** State `High`, `Medium`, or `Low`; explain who benefits and the expected
   user, system, or development outcome. Include the main cost, regression risk, or
   cross-system consequence. Distinguish impact from urgency: valuable work can wait.

## Required response format

Start with a short context paragraph describing the verified current behavior,
why the issue matters now, and the affected implementation areas. Include relevant
file or GitHub links. If needed, add a brief verification approach and material
uncertainties before the table so the recommended work is ready to resume.

Tell the user before the table that you will wait for their response before acting.
End with **one table using these exact six columns**, one row per reviewed issue.
Keep cells readable; use `<br>` for separate options inside a cell. Do not substitute
the former four-column or two-column assessment formats.

| Issue and title | Urgency | Keep issue / refine scope | Proposed implementations (1–3) | Continue or close | Impact |
|---|---|---|---|---|---|
| [#N — Current issue title](ISSUE_URL) | High — evidence-based reason | REFINE — specific scope and acceptance-criteria changes | 1. **(Recommended)** Concrete approach and tradeoff.<br>2. Alternative and tradeoff, only if useful. | CONTINUE — reason and any prerequisite | High — beneficiaries, expected outcome, and main risk/cost |

## Pause and follow-up

**After presenting the review table, stop and await the user's response.** During
the review, do not implement changes, create a branch or PR, edit GitHub issues or
the roadmap, close issues, or modify project files. The user explicitly wants to
choose the next action after reviewing the assessment.

If the response requests clarification or revises the approach, answer or revise
the review without treating it as implementation approval. If it authorizes work,
carry the gathered context forward and follow the issue-implementer workflow in
`../eso-trade-issue-implementer/SKILL.md` for the approved scope. Recheck issue/PR
and working-tree state when resuming, especially after a delay. Do not repeat the
whole review unless new evidence changes the decision. A request to close or amend
the issue authorizes that requested action, not unrelated implementation work.
