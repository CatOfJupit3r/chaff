# Contributing to Chaff

Bug fixes, rough edges you hit while reviewing, and small focused features are welcome. So are reports of what confused you.

## Before you start

- Search existing issues and pull requests first.
- Open an issue before a large feature or a change to how reviews, snapshots or findings work, so the approach is agreed before you build it.
- Keep pull requests focused. Unrelated cleanup is easier to review on its own.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Security reports go through [SECURITY.md](SECURITY.md), never a public issue.

## Setup

You need Git 2.40 or newer, Node.js 24 and pnpm 11.5.0.

```bash
git clone https://github.com/CatOfJupit3r/chaff.git
cd chaff
corepack enable
pnpm install
pnpm run dev
```

`pnpm run dev` opens Chaff in Electron with live reload, using a separate `Chaff Dev` data folder, so your installed app's reviews are not touched. `pnpm run data:clear` empties that folder.

`pnpm install` also sets up the git hooks. The pre-commit hook formats, lints and type-checks staged files. The post-merge hook only rebuilds `/Applications/Chaff.app` if you said yes to that in `pnpm run install-app`.

## Where things are

- `apps/desktop`: the Electron main process, preload and packaging.
- `apps/web`: the renderer, a React app that reaches the core only through oRPC.
- `packages/core`: the core library with routers, services, SQLite schema and git access.
- `packages/server-contract` and `packages/common`: shared contracts, enums and helpers.
- `site` and `scripts/app-capture`: the project page, and the recorder for its clips and the README screenshots (`pnpm run videos:record`, `pnpm run screenshots:capture`).

[docs/development.md](docs/development.md) covers the workspace commands and workflow, and [docs/how-it-works.md](docs/how-it-works.md) the architecture. The coding conventions live in [AGENTS.md](AGENTS.md) and `.agents/skills/`. They are written for coding agents, and they apply to people just the same.

## Code and tests

- Every color, radius and font comes from a theme token. Raw palette classes fail lint.
- Closed sets of strings (statuses, kinds, modes) use `enumwaii`, never raw literals.
- Add tests for behavior changes: core features through the router with real git repositories in temp folders, renderer logic next to its feature under `apps/web/test`.
- Don't test migrations, generated code, constants or plain rendering.

## Pull requests

1. Branch off `main`.
2. Use conventional commits; `pnpm commit` walks you through one.
3. Explain the problem and the behavior you chose, and link the issue if there is one.
4. Run `pnpm run verify --tests` and say what else you checked. Screenshots or a short clip help for UI changes.

## License

Chaff is licensed under [AGPL-3.0](LICENSE). By contributing, you agree that your contribution is licensed under the same terms.
