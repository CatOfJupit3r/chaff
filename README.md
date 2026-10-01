# Chaff

Chaff is a self-hosted, stack-aware review workspace for AI-written changes. It loads GitLab merge requests (including stacks of MRs that build on each other), lets you review them one change, function, or line range at a time, captures concerns in a keystroke, and brings you back only to what changed after the agent pushes fixes.

Chaff runs as a server you host (Docker) and open in a browser. The UI is themeable and ships with light and dark modes.

## Agentic Tooling

Claude Code and any other AGENTS.md-aware agent read from the same skill library under `.agents/skills/*/SKILL.md`:

- `AGENTS.md` (with `CLAUDE.md` symlinked to it) is the always-on guide and points into `.agents/skills/`.
- `.claude/settings.json` configures default tool permissions for Claude Code.

## Tech Stack

- **Runtime & Tooling:** Node.js 24, pnpm workspaces, Commitizen, Husky
- **Backend:** TypeScript, Hono, oRPC, Drizzle ORM/PostgreSQL, Better Auth, tsyringe, Zod, Vitest
- **Frontend:** React 19, Vite, TanStack Start/Router/Query/Form, Base UI, Tailwind CSS (theme tokens only), Vitest
- **Shared:** `@chaff/server-contract` (oRPC contracts + OpenAPI), `@chaff/common` (shared helpers and enums), `@chaff/enumwaii` (typed closed string sets + ESLint rules)

## Repository Structure

- `apps/server` - Hono API, oRPC routers, Drizzle schema, Better Auth setup
- `apps/web` - React 19 client, TanStack Router tree, auth flows, theme tokens in `src/index.css`
- `packages/server-contract` - API contract definitions and schema exports
- `packages/common` - shared utilities, types, constants, and helpers
- `packages/enumwaii` - enum helper library and its ESLint rules
- `configs/*` - shared ESLint and Prettier configs

## Prerequisites

- Git ≥ 2.40
- Docker Desktop (required for the PostgreSQL container)
- Node.js **exactly** v24 (use nvm or similar)
- pnpm 11.5.0

### Install Node.js v24

Using nvm:
```bash
nvm install 24
nvm use 24
```

Or using the `.nvmrc` file in the repo:
```bash
nvm use
```

### Install pnpm

```bash
corepack enable
corepack prepare pnpm@11.5.0 --activate
```

Or via npm:
```bash
npm install -g pnpm@11.5.0
```

## Getting Started

```bash
git clone https://github.com/CatOfJupit3r/chaff.git
cd chaff
pnpm install
```

1. Copy environment templates: duplicate `.env.example` to `.env` in both `apps/server` and `apps/web`.
2. Start Docker Desktop so PostgreSQL can launch.
3. Boot everything with `pnpm run dev`:
    - Web client: `http://localhost:3030`
    - API + Better Auth: `http://localhost:5050`
    - PostgreSQL starts via `docker compose -f docker-compose.dev.yml --profile postgres up -d --wait`

## Workspace Commands

- `pnpm run dev` – start API, web app, and PostgreSQL
- `pnpm run db:generate` – generate a Drizzle migration from the schema
- `pnpm run db:migrate` – apply Drizzle migrations to PostgreSQL
- `pnpm run db:push` – push the schema directly during local development
- `pnpm run check-types` – TypeScript project references (server + shared)
- `pnpm run lint` – ESLint across the monorepo
- `pnpm run prettify` – format workspace source files
- `pnpm run prepare` – reinstall Husky hooks if they go missing
- `pnpm test` – run all tests with Vitest

## Development Workflow

1. Create a GitHub issue describing the work.
2. Branch off `main` as `<issue-number>-<short-slug>` (e.g., `42-improve-login-flow`).
3. Stage changes and run `git cz` (or `pnpm commit`) for conventional commits.
4. Push the branch and open a PR targeting `main`; request review from `@CatOfJupit3r`.

## Pre-commit Hooks & Troubleshooting

- Husky runs `pnpm exec lint-staged` on commit to format, lint, and type-check staged files.
- Re-run failed checks locally with:
   ```bash
   pnpm exec lint-staged --no-stash
   ```
- Typical fixes:
   - Missing deps: `pnpm install`
   - Formatting issues: `pnpm run prettier` then re-stage
   - Lint errors: `pnpm run lint`
   - Type errors: `pnpm run check-types`

## Tips & Conventions

- Keep `pnpm run dev` active regularly to keep local PostgreSQL available.
- Avoid rebasing on `main`; prefer merging.
- Use the shared contract utilities (`tanstackRPC` helpers, shared schemas) instead of duplicating types or query keys.
- When extending the API, register new routers in `apps/server/src/routers/app-router.ts` and add error codes to `packages/common/src/enums/errors.enums.ts`.
- Use theme token classes for every color (`bg-background`, `text-destructive`, ...); raw Tailwind palette colors fail lint.
