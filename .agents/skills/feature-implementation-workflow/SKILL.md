---
name: feature-implementation-workflow
description: >
  Workflow for implementing a full-stack Chaff feature contract-first: explore, load the skills the work touches, implement in layer order (schema, contract, core, renderer, tests), validate each checkpoint with `pnpm run verify`, and finish with an evidence-backed report. Use for any feature or change that crosses the core and the renderer.
---

# Feature Implementation Workflow

How to take a feature from request to a verified change. The contract is the only API surface between the core and the renderer, so it is settled first and both sides are built against it.

## Step 1: Pin Down The Scope

Before writing code, write down in a sentence or two:

- the behavior the user should see when it is done,
- what is explicitly out of scope,
- how you will know it works (tests, a check in the running app, or both).

If the request is broad, split it into small slices that each leave the app working, and do them one at a time. A slice is small enough when its validation is one or two commands and its diff can be reviewed in one sitting.

## Step 2: Explore The Code

Delegate the first sweep to an `Explore` subagent instead of reading broadly inline. Ask it to locate the files, patterns and existing implementations the feature touches and to return paths with one-line descriptions, not file contents. Use the report to learn:

- the existing patterns for this feature area,
- where new files belong,
- what to reuse and what must not be rebuilt,
- which tests already cover the surface.

Then read only the files you will edit. If an issue, a plan or a comment disagrees with the source, trust the source and note the difference.

## Step 3: Load Only The Skills The Work Touches

Load each skill at the point you start that kind of work, not all up front.

| Work type | Skill |
|---|---|
| Closed sets of strings (status, kind, mode) | `enumwaii` (mandatory) |
| Database schema or migrations | `drizzle-orm` |
| New oRPC contracts / API endpoints | `orpc-contract-creation` |
| Core router handlers | `server-router-implementation` |
| Feature module boundaries (service, repository, resolver) | `server-module` |
| Error handling | `server-error-handling` |
| DI setup, new services | `dependency-injection-setup` |
| TanStack Query hooks and mutations | `tanstack-query-integration` |
| React components and routes | `react-component-patterns` |
| Forms with TanStack Form and Zod | `tanstack-forms` |
| Tests | `server-testing` |
| Handing work to another coding agent | `agent-implementation-proof` |
| Reviewing a diff before handoff | `review-code` |

## Step 4: Implement In Layer Order

1. Schema and migration, if the data layer changes (`pnpm run db:generate`).
2. Shared contracts, constants, enums and error codes.
3. Core: repositories, resolvers, services and router handlers.
4. Renderer query and mutation hooks.
5. UI components and routes.
6. Tests for the behavior you added or changed.

Follow `AGENTS.md` throughout: theme tokens for every color, `enumwaii` for closed string sets, no barrel files, explicit visibility on class members.

## Step 5: Validate Each Checkpoint

After each meaningful unit of work, run the narrowest check that covers it. Route all verification through `pnpm run verify`, which reports honest PASS/FAIL with an exit code you can trust:

```bash
pnpm run verify --filter web
pnpm run verify --filter @chaff/core
pnpm run verify --filter desktop
pnpm run verify --filter @chaff/server-contract
```

Run it unscoped when a change crosses packages, and add `--tests` to run the suite:

```bash
pnpm run verify --tests
```

Fix the root cause when something fails before moving on; don't carry failures into the next slice. Run `pnpm run prettify` once at the end, not between edits.

For behavior a test can't show (a screen, a flow across windows), check it in the running app with `pnpm run dev` and say what you clicked through.

## Step 6: Evidence-Backed Report

End with a report someone else can audit:

```md
## Completion Report

### Implemented
- <behavior> — evidence: <files>, validation: <command and result>

### Not Done / Blocked
- <item> — reason: <blocker or deferral>

### Commands Run
- `<command>` — pass / fail / not run

### Remaining Risk
- <risk, or none>
```

If validation could not be run, say exactly what was not run and why. Never claim completion without validation evidence.

## Notes

- Prefer small, verified slices over one large change.
- Do not let the same agent make a broad change and also be its only reviewer when correctness matters; hand the diff to a separate `review-code` pass.
