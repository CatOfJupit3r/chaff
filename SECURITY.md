# Security policy

## Supported versions

Chaff has no releases yet; it is built from source. Only the latest `main` gets security fixes. If you run an older checkout, `git pull` and rebuild before reporting.

## Report a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's [private vulnerability reporting form](https://github.com/CatOfJupit3r/chaff/security/advisories/new) instead.

Include, when you can:

- the commit you built from and your OS;
- what an attacker can do and how realistic it is;
- steps to reproduce, or a proof of concept;
- any mitigation you already tried.

You will get an acknowledgement, then a fix and a coordinated disclosure if the report holds up. Please keep it private until a fix is on `main` or a timeline has been agreed.

## What is in scope

Chaff runs on your machine, reads your repositories and talks to GitLab, GitHub and local coding agents. The boundaries it promises, and that reports against are most welcome:

- **Your repositories are read-only.** Chaff reads them with your own `git` and never writes to them: no checkouts, refs, index or stash changes. Everything it writes goes to its own store next to its database.
- **Tokens stay in the main process.** GitLab and GitHub tokens are encrypted with Electron `safeStorage` and are never sent to the renderer.
- **The renderer is sandboxed.** `contextIsolation`, `sandbox`, no `nodeIntegration` and a strict content security policy. The preload only forwards a `MessagePort`. Links open externally only for `https:` and editor URL schemes.
- **Agents get the access they are told.** The AI digest runs your local Claude Code or Codex read-only in a throwaway copy of the snapshot. **Fix with agent** gives write access only inside a new checkout in Chaff's store, after a confirmation. Coding agents reach findings over a local socket in Chaff's data folder, only while agent access is turned on.

Out of scope: bugs in Claude Code, Codex, GitLab, GitHub, Electron or other dependencies (report those upstream; tell us too if Chaff makes them exploitable), and anything that needs an attacker who already controls your user account.
