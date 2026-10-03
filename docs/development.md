# Developing Chaff

Setup and first run are in the [README](../README.md#getting-started). This page covers the repository and the day-to-day workflow. Coding standards live in [AGENTS.md](../AGENTS.md) and the skills under `.agents/skills/`.

## Repository structure

- `apps/desktop` - Electron main process and preload, packaging config, app icon
- `apps/web` - the renderer: React single-page app, TanStack Router tree, theme tokens in `src/index.css`
- `packages/core` (`@chaff/core`) - the Chaff core, a library bundled into the desktop main process: oRPC routers, services, SQLite schema and migrations, read-only git access, snapshot store, tree-sitter units
- `packages/server-contract` - API contract definitions and schema exports
- `packages/common` - shared utilities, types, constants, and helpers
- `packages/enumwaii` - enum helper library and its ESLint rules
- `configs/*` - shared ESLint and Prettier configs
- `assets/brand` - Chaff icon: `chaff-mark.svg` (single-color, uses `currentColor`) and the dark/light PNG originals
- `docs` - this documentation and the screenshots used in the README

## Workspace commands

- `pnpm run dev` - open Chaff with live reload (renderer on `http://localhost:3030`; core and main-process changes rebuild and restart the app)
- `pnpm run build` - build every package, including the desktop bundle
- `pnpm run package` - build an unsigned installer for the current OS
- `pnpm run verify` - type-check and lint the workspace (`--tests` also runs the tests, `--filter <pkg>` scopes it)
- `pnpm run db:generate` - generate a Drizzle migration from the schema
- `pnpm run check-types` - TypeScript checks across the workspace
- `pnpm run lint` - ESLint across the monorepo
- `pnpm run prettify` - format workspace source files
- `pnpm run prepare` - reinstall Husky hooks if they go missing
- `pnpm test` - run all tests with Vitest

## Workflow

1. Create a GitHub issue describing the work.
2. Branch off `main` as `<issue-number>-<short-slug>` (e.g., `42-add-review-queue`).
3. Stage changes and run `git cz` (or `pnpm commit`) for conventional commits.
4. Push the branch and open a PR targeting `main`; request review from `@CatOfJupit3r`.

## Pre-commit hooks and troubleshooting

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

## Tips and conventions

- Avoid rebasing on `main`; prefer merging.
- Use the shared contract utilities (`tanstackRPC` helpers, shared schemas) instead of duplicating types or query keys.
- When extending the API, register new routers in `packages/core/src/routers/app-router.ts` and add error codes to `packages/common/src/enums/errors.enums.ts`.
- Use theme token classes for every color (`bg-surface`, `text-muted`, `text-bad`, ...); raw Tailwind palette colors fail lint.

## Trying the packaged app

The packaged app catches problems the dev server does not (for example, how WASM files are loaded from the app archive). On Linux without a display:

```bash
pnpm run package
xvfb-run -a apps/desktop/release/linux-unpacked/chaff --remote-debugging-port=9333
```

Add `--no-sandbox` when running as root, as in a container.

Playwright's `chromium.connectOverCDP('http://localhost:9333')` can then drive the window. The README screenshots were taken this way, against a small demo repository with a three-branch stack.
