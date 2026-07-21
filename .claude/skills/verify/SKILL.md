---
name: verify
description: Run lint, test, and build checks to validate changes before committing
---

# Verify Changes

Run the full verification suite to ensure changes are valid.

## Steps

1. `pnpm lint` (eslint → tsc)
2. `pnpm test` (Vitest)
3. `pnpm build` (Vite library build)
4. Once the CLI exists (see the refactor plan), smoke-test it: run `node ./bin/xstyle.mjs build` against a fixture config into a temp dir and assert the output CSS file exists and is non-empty.
5. Report results. If anything fails, show the errors and suggest fixes.
