---
phase: 04-release-and-ci-cd
plan: "02"
subsystem: infra
tags: [github-actions, ci-cd, npm-publish, oidc, trusted-publishing, node-matrix]

# Dependency graph
requires:
  - phase: 04-release-and-ci-cd
    provides: Phase 4 context, research on OIDC, Node version matrix decisions
provides:
  - GitHub Actions CI workflow (ci.yml) — PR checks on Node 18/20/22 matrix
  - GitHub Actions release workflow (release.yml) — OIDC keyless npm publish on push to main
affects:
  - npm publishing (OIDC Trusted Publisher must be configured on npmjs.com before first merge to main)
  - Branch protection (status check names: check (18.x), check (20.x), check (22.x) after first CI run)

# Tech tracking
tech-stack:
  added:
    - actions/checkout@v4
    - actions/setup-node@v4
    - npm OIDC Trusted Publishing (no token required)
  patterns:
    - Node version matrix (18.x, 20.x, 22.x) for CI coverage
    - OIDC keyless npm publish with provenance attestation
    - Defense-in-depth: full lint+build+test runs before every publish

key-files:
  created:
    - .github/workflows/ci.yml
    - .github/workflows/release.yml
  modified: []

key-decisions:
  - "ci.yml job named 'check' so status checks appear as 'check (18.x)', 'check (20.x)', 'check (22.x)' for branch protection"
  - "release.yml uses environment: npm (must match Trusted Publisher config on npmjs.com)"
  - "release.yml includes explicit npm upgrade step (npm install -g npm@latest) as OIDC requires npm >=11.5.1"
  - "NODE_AUTH_TOKEN deliberately omitted from release.yml — OIDC handles auth automatically"
  - "registry-url set in setup-node so .npmrc is configured; required for npm publish to work"

patterns-established:
  - "Pattern: Separate CI and release workflows (independently triggered, clearer responsibilities)"
  - "Pattern: Release job runs full lint+build+test before publish (defense in depth)"

requirements-completed: [INFR-04, INFR-05]

# Metrics
duration: 1min
completed: 2026-03-14
---

# Phase 4 Plan 02: GitHub Actions CI and Release Workflows Summary

**GitHub Actions CI workflow with Node 18/20/22 matrix and OIDC keyless npm publish with provenance on merge to main**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-14T08:34:15Z
- **Completed:** 2026-03-14T08:35:16Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Created ci.yml triggering on pull_request to main, running lint, build, and test across Node 18.x, 20.x, 22.x
- Created release.yml triggering on push to main with OIDC configuration (id-token: write, environment: npm), Node 22.x, npm upgrade step, and provenance publish
- Both workflows include defense-in-depth checks before publish (lint + build + test)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CI and Release GitHub Actions workflows** - `ef879bb` (chore)

**Plan metadata:** (see final docs commit)

## Files Created/Modified

- `.github/workflows/ci.yml` - PR check workflow running lint, build, test on Node 18/20/22 matrix
- `.github/workflows/release.yml` - npm release workflow with OIDC (keyless auth), provenance, and full pre-publish checks

## Decisions Made

- OIDC Trusted Publishing selected over NPM_TOKEN to eliminate long-lived secrets; provenance enabled for verified badge on npmjs.com
- npm upgrade step (`npm install -g npm@latest`) included because actions/setup-node installs Node-bundled npm (~10.x) which does not support OIDC; requires npm >=11.5.1
- `registry-url` included in setup-node step (required for npm publish to function even with OIDC)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before the first merge to main, the following manual steps are required:

1. **First publish (bootstrap):** OIDC cannot publish a package that does not yet exist on npm. Publish 0.0.1 manually using a short-lived granular access token (`NPM_TOKEN` GitHub secret), then remove the secret after successful first publish.
2. **Configure Trusted Publisher on npmjs.com:** Go to npmjs.com -> package settings -> Access -> Trusted Publishers. Add the GitHub repository with workflow filename `release.yml` and environment name `npm`.
3. **Create `npm` environment in GitHub:** Go to repository Settings -> Environments -> New environment. Name it `npm` (matches the `environment: npm` field in release.yml).
4. **Branch protection status checks:** After the first CI workflow run (first PR), note the exact check names (`check (18.x)`, `check (20.x)`, `check (22.x)`) and add them to branch protection rules for the `main` branch.

## Next Phase Readiness

- CI and release infrastructure is complete
- Remaining phase 4 tasks: README.md (Portuguese), LICENSE, package.json files whitelist, develop branch creation (plan 04-01)

---
*Phase: 04-release-and-ci-cd*
*Completed: 2026-03-14*

## Self-Check: PASSED

- FOUND: .github/workflows/ci.yml
- FOUND: .github/workflows/release.yml
- FOUND: .planning/phases/04-release-and-ci-cd/04-02-SUMMARY.md
- FOUND commit: ef879bb (chore(04-02): add GitHub Actions CI and release workflows)
