# How Chaff works

This page describes what runs today. Parts of the design that are not built yet are marked **planned**; the [README](../README.md#what-works-today) has the full list.

## The pieces

```mermaid
flowchart TB
  subgraph Renderer["Renderer (apps/web)"]
    UI["React SPA<br/>Reviews, Full diff, dialogs"]
  end
  subgraph Main["Electron main (apps/desktop)"]
    Bridge["oRPC handler<br/>over a MessagePort"]
    subgraph Core["@chaff/core"]
      WS["Workspaces and<br/>branch stacks"]
      SB["Snapshot builder"]
      TS["Tree-sitter (WASM)"]
      DB[("SQLite<br/>chaff.db")]
    end
  end
  Repo[("Your repository<br/>read only")]
  Store[("Snapshot store<br/>bare repo per workspace")]

  UI -- "typed calls" --> Bridge --> Core
  WS -- "git (read)" --> Repo
  SB -- "git fetch" --> Store
  Store -- "fetch from" --> Repo
  SB --> TS
  Core --> DB
```

- **Renderer.** A React single-page app. It never touches Node, the file system or git; everything goes through typed calls to the core. It runs sandboxed with context isolation and a strict Content Security Policy, and is served from Chaff's own `chaff://app/` scheme.
- **Bridge.** The preload script hands the renderer one end of a `MessageChannel`. The main process checks that the sender is Chaff's own page, then serves the core's oRPC router over that port. Calls and their errors are typed by the contracts in `packages/server-contract`.
- **Core.** `@chaff/core` is a plain TypeScript library with no Electron imports, bundled into the main process. Anything that needs the OS (picking a folder, opening a link, applying the native theme) goes through a small host interface the desktop app provides, which keeps a later self-hosted web mode possible without a rewrite.
- **SQLite.** One database file in the app data folder holds workspaces, review targets, snapshots, regions, units and settings. It uses Node's built-in `node:sqlite` through Drizzle ORM, so there are no native modules to rebuild for Electron.

## Repositories are read, never written

Adding a repository stores its path and default branch. From then on Chaff runs your installed `git` against it with read-only commands such as `for-each-ref`, `rev-list`, `rev-parse` and `merge-base`, and the snapshot store fetches from it. It does not check out branches, add refs, touch the index or the stash, or write anywhere inside the repository.

## Finding stacks

Chaff lists your local branches and suggests a parent for each one:

- It walks the branch's history, merged-in commits included, and collects the tips of other local branches it finds.
- It picks the one with the fewest commits between that tip and the branch, so a branch that merged newer commits from its parent (or from the default branch) still stacks on its parent.
- Ties go to the branch's upstream, then the default branch, then alphabetical order. At the branch's own tip, only the default branch or an alphabetically earlier branch can be the parent, so two branches on the same commit don't claim each other.
- A branch with no other branch in its history stacks on the default branch.

Branches that chain this way form a stack, shown on the Reviews screen as `feature/async-input <- feature/job-options <- feature/consent`. Each branch is reviewed against its parent, so you read only what that branch adds. Editing parents by hand and a cumulative view of the whole stack are **planned** for the Stack overview.

## Snapshots

Starting a review freezes a **snapshot** of one branch against its parent:

1. Chaff fetches the branch and its parent from your repository into its own **snapshot store**, a bare git repository per workspace at `<app data>/stores/<workspace id>.git`.
2. It records three commits: the branch head, the parent head and their merge base. The diff is always merge base to branch head.
3. It pins those commits under `refs/chaff/snapshots/<snapshot id>/{head,parent,base}` in the store, so rebasing, force-updating or deleting the branch in your repository never breaks a review, and git's garbage collection can't remove them.

While you review, Chaff compares the snapshot with your repository and reports what moved: new commits on the branch, a rewritten branch (its old head is no longer in its history), a parent that moved, or a deleted branch. Nothing under the review changes until you press **Update**, which freezes a new snapshot of the same target. Comparing the two snapshots (interdiffs, keeping marks on unchanged code, re-anchoring findings) is the **planned** second pass.

## Regions and units

Each snapshot is broken down before you read it:

- A **region** is one contiguous changed range in one file, with a content hash. Every changed line belongs to exactly one region. Changes without line content (binary files, renames, mode changes) get one file-level region, so they are counted too.
- A **unit** is something you review. Chaff parses the old and new version of each file with tree-sitter and assigns each region to the declaration that encloses it: a function, method, class or other declaration becomes a **Function** unit, shown whole. Changes outside any declaration (imports, top-level statements, config, deleted, generated or unsupported files) become **Section** units. Nothing is dropped for being small or uninteresting.
- Supported grammars: TypeScript, TSX, JavaScript, Python, Go, Rust, Java, C#, Ruby, PHP, C++, Bash and PowerShell.

Units are numbered across the snapshot in reading order, and their count shows on the Reviews screen. Focus review walks them one at a time; a decision on a unit covers every region in it, so the Full diff can show line coverage. The AI digest groups units into the behavior changes they make up (below).

## Reading order

Files in the Full diff are sorted so that what other code depends on comes first:

1. Types, interfaces, contracts and schemas.
2. Source files, each followed by its tests.
3. Config, then docs, then generated files, then binaries.

Generated files, lockfiles and very large diffs stay collapsed until you ask for them.

## Where data lives

| What | Where |
| --- | --- |
| Database | `<app data>/chaff.db` |
| Snapshot stores | `<app data>/stores/<workspace id>.git` |
| Logs | the OS log folder for Chaff, `chaff.log` |

`<app data>` is `%APPDATA%\Chaff` on Windows, `~/Library/Application Support/Chaff` on macOS and `~/.config/Chaff` on Linux. Development runs (`pnpm run dev`) use a separate `Chaff Dev` folder. Reviews stay on that machine; export (**planned**) is the way to move them.

## The AI digest

The digest is optional and read-only. Chaff runs the Claude Code (`claude -p`) or Codex (`codex exec`) already signed in on your machine:

1. Chaff checks out the snapshot's head into a throwaway worktree of its own store, under `<app data>/digests/<id>`, never in your repository.
2. The agent gets the branch's commit messages, the list of units with short ids (`u1`, `u2`, ...) and the diff, and may only use read and search tools. Claude Code runs with `--tools Read,Grep,Glob`, every editing, shell and web tool disallowed, and your project's settings and MCP servers ignored; Codex runs in its `read-only` sandbox.
3. It answers in a fixed JSON schema: an overview, groups of units with before, after and intent (marked documented or inferred), a reading order, a note per unit with things worth checking and related tests, and Mermaid diagrams.
4. Chaff checks the answer before keeping it. Unknown ids are dropped, a unit belongs to one group at most, units no group explains go to a visible "Other changes, not yet explained" group, the reading order is completed so it covers every unit once, and a test claimed to have passed is downgraded to "read", because nothing ran.
5. The worktree is deleted. A digest that runs longer than 20 minutes, or that you stop, leaves nothing behind.

## Planned: GitLab and GitHub

- **GitLab merge requests** are the primary target: load an MR or a stack of MRs into the snapshot store, use MR diff versions as snapshots, and post findings back as draft notes you publish yourself.
- **GitHub pull requests** follow the same provider interface: import PRs and stacks, and export findings as a pending review that is never submitted automatically.
