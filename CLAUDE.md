# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Simpler is a Linux-first, local-first Markdown notes app built on Tauri 2 (Rust backend) + React/TypeScript/Vite (UI). It opens a normal folder as a "Workspace", edits Raw Markdown in place, and can Sync a Git-backed Workspace through a Git remote (GitHub via OAuth Device Flow primarily, PAT as fallback).

Domain vocabulary (Workspace, Workspace Tree, Note Identity vs Note Title, Raw Markdown, Sync, Local Save, Global Search, Command Palette) is defined precisely in `CONTEXT.md` — read it before naming things or writing UI copy, and prefer its terms over generic alternatives it lists as "Avoid".

## Commands

```bash
npm ci                      # install JS deps
npm run tauri:dev           # run the desktop app (the supported dev command — exposes native fs/git/dialog/keychain)
npm run dev                 # browser-only Vite UI at http://localhost:1427 (no native workspace/git/auth)
npm run test                # vitest run (TS/React tests)
npm run test:native          # cargo test --manifest-path src-tauri/Cargo.toml (Rust tests)
npm run build                # tsc && vite build
npm run tauri -- build --bundles deb,rpm   # package Linux bundles
```

Run a single test file: `npx vitest run src/app/App.test.tsx` (or `-t "test name"` for a single case). For Rust: `cargo test --manifest-path src-tauri/Cargo.toml <test_name>`.

GitHub Device Flow requires an OAuth app client ID: `SIMPLER_GITHUB_CLIENT_ID=your-client-id npm run tauri:dev`.

## Architecture

**Single native command bus.** The UI never calls individual Tauri commands per feature. Everything goes through one Tauri command, `native_command`, carrying a `{ domain, action, payload }` envelope and returning `{ ok, domain, action, data, error }`. Domains are `workspace | filesystem | git | auth`.

- Frontend: `src/native/commands.ts` — every native call is a typed wrapper function (e.g. `gitStatus`, `writeNote`) around `invokeNativeCommand`. When adding a native capability, add a payload/response type pair and a wrapper here rather than inventing a new Tauri command.
- Backend: `src-tauri/src/lib.rs` — `dispatch_native_command` is a long if-chain matching `(domain, action)` to a `*_payload` handler function. Each handler deserializes `serde_json::Value` into a typed payload struct, does the work, and serializes a typed response struct. Follow this same pattern (payload struct → handler fn → branch in `dispatch_native_command`) when adding actions; there's no router abstraction beyond the if-chain.
- All Rust-side collaborators that touch the outside world (Git, the system keychain) are behind small traits (`GitCommandRunner`, `GitHubCredentialStore`, `GitHubDeviceFlowClient`) with a `System*` implementation calling out to `git`/`secret-tool`/`curl` as real subprocesses, and pure functions taking `&impl Trait` for the logic. This is what makes the Git/auth logic unit-testable without a real git repo or keychain — write new Git/keychain logic the same way.

**Git is a real subprocess, not a library** (ADR 0007) — `SystemGitCommandRunner` shells out to `git`. Sync is modeled as a product action, not raw Git plumbing exposed to the user (ADR 0001): `gitSync` does add/commit/pull --rebase/push and surfaces only `synced` or `conflict`, with conflict resolution (`local`/`remote`/`manual`) mapped onto `git checkout --theirs/--ours` + `rebase --continue`. Note the code comment in `resolve_git_conflict`: during `pull --rebase`, Git's `theirs` is the local commit being replayed, so "local" resolution uses `--theirs` and "remote" uses `--ours` — this is intentionally inverted from normal merge semantics.

**Workspace metadata lives in a hidden `.simpler/` folder** (ADR 0005), split into:
- `.simpler/workspace.json` — shared, versioned, meant to be committed.
- `.simpler/local/state.json` — local-only (last opened note, etc.); `.simpler/.gitignore` excludes `local/`.

Never write app state as frontmatter into user notes. All workspace-relative paths are validated in `resolve_workspace_path`/`sanitize_child_name` to reject absolute paths, `..`, and hidden/internal (`.`-prefixed) names — reuse these instead of ad hoc path joining.

**Frontend state** is one `AppState` object (`src/app/appState.ts`) owned by `App.tsx`, updated via `setAppState` callbacks; there's no external state library. `automaticSyncScheduler.ts` is a separate, independently-testable state machine (not driven by React state) that decides *when* to trigger sync (on open, on local save with debounce, on close) — `App.tsx` wires its `requestSync`/`markPending` callbacks to the actual `gitSync` native call.

**UI shell**: `ClassicShell.tsx` is the single top-level layout component (routes, sidebar/tree, editor, sync status, global search, GitHub settings) driven entirely by props from `App.tsx` — it holds no native calls itself. `MarkdownEditor.tsx` wraps CodeMirror 6 (ADR 0004).

## Testing conventions

- TS/React: Vitest + Testing Library, colocated `*.test.tsx`/`*.test.ts` files (e.g. `App.test.tsx` next to `App.tsx`).
- Rust: unit tests exercise the pure sync/status/conflict functions against fake `GitCommandRunner`/`GitHubCredentialStore`/`GitHubDeviceFlowClient` implementations rather than real subprocesses — follow that pattern for new native logic instead of shelling out in tests.

## Issue tracking (agent workflow)

Issues/specs are local Markdown files under `.scratch/<feature-slug>/`, not GitHub issues: `spec.md` plus one file per ticket under `issues/<NN>-<slug>.md`. Full conventions in `docs/agents/issue-tracker.md`; triage label meanings in `docs/agents/triage-labels.md`. See `docs/agents/domain.md` for the domain-doc layout norms.
