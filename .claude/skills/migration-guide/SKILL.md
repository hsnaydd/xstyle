---
name: migration-guide
description: Analyze changes since the last release for breaking changes and document them in per-version migration files indexed from MIGRATION.md. Use after making a breaking change or before a release.
---

# Migration Guide

Analyze code changes as functional impacts on downstream consumers, and maintain a clean, professional, non-redundant migration history: one file per version transition under `docs/migrations/`, indexed from `MIGRATION.md`.

## Scope & Constraints

- **Only touch `MIGRATION.md` (repo root) and `docs/migrations/`** (create either if missing).
- **Never touch `CHANGELOG.md`** — it is managed by release-please.
- All commands in upgrade instructions use **pnpm** (never npm).
- All generated documentation is in **English**.

## Source of truth

Migration docs cover version-to-version transitions, so analyze the whole release cycle, not just the current edit:

1. Find the last release tag (`git describe --tags --abbrev=0`). If one exists, analyze `git diff <last-tag>...HEAD` **plus** uncommitted changes.
2. If no tag exists yet, analyze staged changes (`git diff --cached`); if nothing is staged, fall back to all uncommitted changes (`git diff HEAD` + untracked files).
3. Tell the user which range was analyzed.

Additionally, use commit history as a detection signal: `git log <last-tag>..HEAD --oneline` (or `git log` if no tag) — commits marked `!` or containing a `BREAKING CHANGE` footer must each be accounted for in the migration docs. The diff analysis below can still find breaking changes the commit messages missed.

## What counts as breaking in xstyle

A change is breaking if a downstream consumer would break without making adjustments. Check the diff against these xstyle-specific contracts:

1. **Public API** — anything reachable from the three entries (`src/index.ts`, `src/cli.ts`, `src/vite.ts`): renamed/removed exports, changed parameter types/order/requirement, changed return types.
2. **Config schema** — changes to `defineConfig` / config types (`src/config/`) that force users to edit their `xstyle.config.ts` (renamed options, new required fields, changed validation).
3. **Generated CSS contract** — the key grammar (`styleName-token[@bp]`), class-name derivation, or the hash wire format in `src/shared/class-name.ts`. Any change here invalidates every previously generated stylesheet and hardcoded class name — always breaking.
4. **Default preset** — removed/renamed rules or groups in `src/presets/default/`: style keys users rely on stop existing (dev-mode validation errors, missing CSS in prod).
5. **CLI & plugin surface** — renamed/removed CLI commands or flags (`runCli`), the `bin` name, the `virtual:xstyle.css` module id, or Vite plugin options.
6. **Requirements** — raised Node version, major bumps to the `vite` peer range, or new required peer dependencies.

Purely internal refactors (no observable change through the surfaces above) are **not** breaking — do not document them.

## Versioning

If the user does not provide a target version:

1. Read the current `"version"` from `package.json`.
2. Compute the next version the way release-please would for a breaking change:
   - **Pre-1.0** (`0.x.y`): breaking bumps the **minor** → transition `0.<minor>.x` → `0.<minor+1>.0`.
   - **1.0+**: breaking bumps the **major** → transition `<major>.x` → `<major+1>.0.0`.

This is a prediction — release-please computes the actual version from the commit history at release time. Repeated runs before a release land in the same file (package.json only changes at release). If the prediction ever diverges (manual version bump, release-please deciding differently), the stale-file check in the Workflow reconciles it on the next run.

## File layout

- **`MIGRATION.md`** (repo root) is the index only — no migration content. Skeleton when creating it:

  ```markdown
  # Migration Guide

  Upgrade instructions for breaking changes between xstyle versions, newest first.

  - [From version 0.4.x to 0.5.0](docs/migrations/v0.5.0.md)
    - [<Breaking Change Title>](docs/migrations/v0.5.0.md#breaking-change-title)
  ```

  One top-level entry per version transition, breaking-change titles as sub-items deep-linking into the version file (valid GitHub-flavored anchors). Insert new entries at the **top** of the list.

- **`docs/migrations/v<target>.md`** — one file per version transition, named after the **target** version (e.g. `v0.5.0.md`). Skeleton:

  ```markdown
  # From version <old> to <new>

  > For other versions, see the [migration guide index](../../MIGRATION.md).

  ## <Breaking Change Title>

  <What changed and why it breaks consumers (one or two sentences).>

  <Actionable upgrade step. Provide Before/After code blocks — typically the
  user's `xstyle.config.ts`, a `css()` call site, or a CLI invocation —
  otherwise clear instructions.>
  ```

- **Merge, don't duplicate:** if the target version's file already exists, merge new entries into it (and add the new sub-items to the index). Never re-document an already-covered change or repeat headers.

For generated-CSS-contract changes (criterion 3), the upgrade step is always: regenerate CSS (`xstyle build` or a Vite rebuild) and update any class names referenced outside `css()`.

## Workflow

1. **Analyze:** determine the diff range (see Source of truth), inspect it, and classify each change against the criteria above. Cross-check against `!`/`BREAKING CHANGE` commits in the range.
2. **Context:** read `package.json` (version), `MIGRATION.md`, and the target version's file under `docs/migrations/` if it exists.
3. **Stale-file check:** if `docs/migrations/` contains a file whose target version has no matching release tag and differs from the computed target, its prediction went stale — rename it to the computed target (merging if the target file already exists), fix its title, and update the index links. Files whose version matches a published tag are historical records — leave them alone.
4. **Consolidate:** group related modifications (e.g. several options renamed in the same config interface) into single cohesive entries.
5. **Deduplicate:** skip changes already documented in the target version's file.
6. **Integrate:** write the version file, then update the index — every entry in the file has a matching sub-item in `MIGRATION.md`, and every index link resolves.
7. **Review:** re-read both files; ensure professional concise language, consistent formatting, valid anchors and relative links.
8. **Report:** list the breaking changes documented (or state that none were found and nothing was changed).
