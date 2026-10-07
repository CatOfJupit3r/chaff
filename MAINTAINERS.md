# Maintainer runbook

The repository settings and chores that the code cannot carry. Contributor instructions are in [CONTRIBUTING.md](CONTRIBUTING.md), vulnerability handling in [SECURITY.md](SECURITY.md).

## Repository settings

- **Pages:** Settings → Pages → Source: **GitHub Actions**. The `Pages` workflow deploys `site/`, `docs/videos` and the icon on every push to `main` that touches them; run it by hand after changing the setting.
- **Security:** turn on private vulnerability reporting, the dependency graph, Dependabot alerts, secret scanning and push protection. The dependency review workflow only runs once the repository is public.
- **Default branch ruleset for `main`:** require pull requests and the `Type Check & Lint`, `Build` and `Tests` checks, block force-pushes and deletion.
- **Pull requests:** turn on automatically deleting head branches.
- **About:** description, homepage `https://catofjupit3r.github.io/chaff/` and topics.

## Site clips

The four clips on the project page come from the packaged app. After a UI change they show:

```bash
pnpm run package
pnpm run videos:record
```

This needs macOS and ffmpeg. It records both themes into `docs/videos` with a throwaway repository and a data folder of its own, so the installed app's reviews are not touched.

## Releases

There are no binary releases; installers are unsigned and built from source. Tag a version on `main` (`git tag v0.1.0 && git push origin v0.1.0`) when a set of changes is worth pointing at.
