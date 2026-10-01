# Chaff

Chaff is a stack-aware review workspace for AI-written changes. It reads stacks of branches that build on each other straight from repositories on your computer (and, later, GitLab merge requests), lets you review them one change, function, or line range at a time, captures concerns in a keystroke, and brings you back only to what changed after the agent pushes fixes.

Chaff is a desktop app built with Electron. It keeps everything in one SQLite file on your machine, reads repositories with your own `git`, and never writes to them. The UI is themeable and ships with light and dark modes.

## Agentic Tooling

Claude Code and any other AGENTS.md-aware agent read from the same skill library under `.agents/skills/*/SKILL.md`:

- `AGENTS.md` (with `CLAUDE.md` symlinked to it) is the always-on guide and points into `.agents/skills/`.

## Tech Stack

- **Runtime & Tooling:** Node.js 24, Electron 44, pnpm workspaces, tsdown, electron-builder, Commitizen, Husky
- **Core:** TypeScript, oRPC, Drizzle ORM on SQLite (`node:sqlite`), tsyringe, Zod, winston, Vitest
- **Renderer:** React 19, Vite, TanStack Router/Query/Form, Base UI, nuqs, jotai, Tailwind CSS (theme tokens only), Vitest
- **Shared:** `@chaff/server-contract` (oRPC contracts), `@chaff/common` (shared helpers and enums), `@chaff/enumwaii` (typed closed string sets + ESLint rules)

## Repository Structure

- `apps/desktop` - Electron main process and preload, packaging config, app icon
- `apps/web` - the renderer: React single-page app, TanStack Router tree, theme tokens in `src/index.css`
- `packages/core` (`@chaff/core`) - the Chaff core, a library bundled into the desktop main process: oRPC routers, services, SQLite schema and migrations, read-only git access
- `packages/server-contract` - API contract definitions and schema exports
- `packages/common` - shared utilities, types, constants, and helpers
- `packages/enumwaii` - enum helper library and its ESLint rules
- `configs/*` - shared ESLint and Prettier configs
- `assets/brand` - Chaff icon: `chaff-mark.svg` (single-color, uses `currentColor`) and the dark/light PNG originals

## Prerequisites

- Git ≥ 2.40 on your PATH
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
pnpm run dev
```

`pnpm run dev` starts the renderer dev server on `http://localhost:3030` and opens Chaff in an Electron window. Renderer changes hot-reload; changes to the core or the main process rebuild and restart the app. The first run downloads the Electron binary. Closing the window ends the session.

Click **Add repository** and pick any folder inside a git repository; its local branch stacks appear on the Reviews screen.

## Building the App

```bash
pnpm run package
```

This builds everything and writes an installer for the current OS to `apps/desktop/release` (a DMG on macOS, an NSIS installer on Windows, an AppImage on Linux). Builds are unsigned and do not auto-update:

- **macOS:** right-click Chaff in Applications and choose **Open** the first time.
- **Windows:** in the SmartScreen prompt choose **More info**, then **Run anyway**.

Chaff keeps its data in the OS app data folder: `%APPDATA%\Chaff` on Windows, `~/Library/Application Support/Chaff` on macOS, `~/.config/Chaff` on Linux. `pnpm run dev` uses a separate `Chaff Dev` folder next to it.

## Workspace Commands

- `pnpm run dev` – open Chaff with live reload
- `pnpm run build` – build every package, including the desktop bundle
- `pnpm run package` – build an unsigned installer for the current OS
- `pnpm run verify` – type-check and lint the workspace (`--tests` also runs the tests)
- `pnpm run db:generate` – generate a Drizzle migration from the schema
- `pnpm run check-types` – TypeScript checks across the workspace
- `pnpm run lint` – ESLint across the monorepo
- `pnpm run prettify` – format workspace source files
- `pnpm run prepare` – reinstall Husky hooks if they go missing
- `pnpm test` – run all tests with Vitest

## Development Workflow

1. Create a GitHub issue describing the work.
2. Branch off `main` as `<issue-number>-<short-slug>` (e.g., `42-add-review-queue`).
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

- Avoid rebasing on `main`; prefer merging.
- Use the shared contract utilities (`tanstackRPC` helpers, shared schemas) instead of duplicating types or query keys.
- When extending the API, register new routers in `packages/core/src/routers/app-router.ts` and add error codes to `packages/common/src/enums/errors.enums.ts`.
- Use theme token classes for every color (`bg-surface`, `text-muted`, `text-bad`, ...); raw Tailwind palette colors fail lint.
