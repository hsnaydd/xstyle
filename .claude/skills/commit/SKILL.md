---
name: commit
description: Commit changes using conventional commits, grouping by concern
disable-model-invocation: true
---

# Commit Changes

Commit all changes (staged and unstaged) following these rules:

## Steps

1. If the repo has a remote: run `git fetch origin main`, then check if local main is behind `origin/main`. If it is, stash any uncommitted changes (`git stash`), run `git pull origin main` to fast-forward, then restore changes (`git stash pop`) before proceeding. **Do not rebase** a branch that has already been merged into main — rebasing replays already-merged commits as duplicates.
2. Run `git status`, `git diff --cached` (staged), and `git diff` (unstaged) to see all changes.
3. If there are no changes at all, tell the user and stop.
4. Analyze **all** changes (staged + unstaged + untracked) and group them into logical units — **one concern per commit**. A "concern" is a single feature, fix, refactor, chore, etc. For example, changes to a module and its tests are one concern, but an unrelated config change is a separate concern.
5. Run `git log main..HEAD --oneline` (skip if on main) to review existing commits on the branch. For each group of changes, check if it logically belongs to an existing commit. If it does, stage the files and fold (`fixup`) the changes into that specific commit instead of creating a new one. If no existing commit matches, create a new commit.
6. Repeat until all changes are committed. Run `git status` to confirm a clean tree.
7. Use **Conventional Commits** format: `type: description`
   - Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`, `ci`, `build`, `revert`
   - No scope needed — this is a single-package repo.
   - Use `!` for breaking changes: `feat!: remove public export`. A change is breaking if a downstream consumer would break without making adjustments.
   - Description: imperative, lowercase, no period at end
   - `.claude/` changes (skills, settings, plans) use `chore:`, not `docs:` — internal tooling, not project docs.
   - `style` is code formatting only; CSS output changes are `feat`/`fix`.
8. Keep subject line under **72 characters** (target 50).
9. Add a body only for non-obvious changes — explain the "why", not the "what". Wrap at 72 characters.

## Important

- **Never commit to `main` once the repo has a remote.** If on `main`, ask the user for a branch name and switch (`git switch -c <name>`) before committing. (While the repo is local-only during the initial refactor, linear commits on `main` are fine.)
- Never use `--no-verify`.
- When folding into a previous commit, create a `fixup!` commit targeting it, then run a non-interactive autosquash rebase using three separate commands:
  1. `git config sequence.editor "sed -i '' 's|^pick \(.*fixup!\)|fixup \1|'"`
  2. `git rebase -i --autosquash main`
  3. `git config --unset sequence.editor`
  Never use `GIT_SEQUENCE_EDITOR=...` or `git -c sequence.editor=...` as they won't match permission patterns. Never use `--no-edit` with rebase.
- **Order commits so every commit in the history is valid** — tests and build must pass at each commit. Infrastructure changes (config, tooling, shared utilities) that other commits depend on must come before the commits that rely on them.
- If a pre-commit hook fails, fix the issue and create a new commit.
- Pass commit messages via HEREDOC:
  ```
  git commit -m "$(cat <<'EOF'
  type: description
  EOF
  )"
  ```
