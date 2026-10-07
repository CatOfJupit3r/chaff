---
name: agent-implementation-proof
description: >
  Require evidence-backed completion reports from Claude Code or any implementation agent. Use when delegating features, fixes or refactors to an agent that may overstate completion.
---

# Agent Implementation Proof

Use this skill when an implementation agent is expected to change code and report back. It prevents false completion claims by requiring file evidence, command evidence and an explicit list of what was not done.

## When To Use

- delegating work to Claude Code or another coding agent,
- a task spans multiple files or packages,
- the user cares about reliability more than optimistic summaries,
- earlier work was claimed complete and later proved incomplete.

## Core Rule

An agent may not claim work is done unless it provides reviewable evidence.

Unsupported claims are not accepted:

- "done"
- "implemented"
- "all tests pass"
- "I fixed everything"

They are allowed only together with exact file evidence and validation evidence.

## Required Delegation Prompt

When delegating, include this block:

```md
Proof requirements:

Do not say "done", "implemented", "completed" or "all tests pass" unless you include evidence.

Your final report must include:

1. Items touched
   - the requested behavior, in the words of the request
   - status: implemented / partially implemented / not implemented
   - evidence: changed files and the validation command

2. Commands actually run
   - command
   - result
   - relevant output or failure excerpt

3. Git diff summary
   - files changed
   - notable additions
   - notable deletions

4. Things not done
   - items left out
   - blockers
   - follow-up needed

If validation was not run, say exactly: "Validation not run" and explain why.
```

## Validation Strategy

Prefer narrow commands first:

```bash
pnpm run verify --filter web
pnpm run verify --filter @chaff/core
pnpm run verify --filter @chaff/server-contract
```

Broaden only when the change crosses packages:

```bash
pnpm run verify
```

Run tests based on the changed surface:

| Changed surface | Expected validation |
|---|---|
| Core service, router, git or DB logic | core integration or unit test (`pnpm run verify --tests --filter @chaff/core`) |
| Shared contract, schema, constants or enums | `pnpm run verify` across packages, since every consumer must still type-check |
| Web component, hook or state behavior | web test or component-level verification |
| Desktop main or preload behavior | desktop test under `apps/desktop/test/` or an explicit manual QA note |
| End-to-end user flow | an explicit manual QA note from the running app (`pnpm run dev`); there is no E2E suite |
| Docs-only change | markdown review; no code checks unless code changed |

## Completion Report Template

Require this structure:

```md
## Completion Report

### 1. Items Touched

- `<requested behavior>`
  - Status: implemented / partially implemented / not implemented
  - Evidence: `<files>`
  - Validation: `<command + result>`

### 2. Commands Actually Run

<command>
Result: pass / fail / not run
Relevant output: <excerpt>

### 3. Git Diff Summary

- Files changed: `<count>`
- Added: `<summary>`
- Modified: `<summary>`
- Deleted: `<summary>`

### 4. Things Not Done

- `<item or blocker>`
```

## Reviewer Checklist

Reject a completion report when:

- it claims tests pass without command output,
- it claims items without matching changed files,
- it says validation was skipped but still claims completion,
- it uses vague phrases instead of evidence,
- it changes unrelated files without explanation.

## Rules

- Evidence beats confidence.
- Failed validation is useful information, not a reason to hide output.
- A partially completed item is reported as partial.
- Do not ask the implementation agent to self-review broad architecture after making broad changes; hand the diff to a separate `review-code` pass.
