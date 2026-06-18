# Security Policy

## Scope

This policy covers the `longieirl/seo-audit-template` repository.

## Reporting a vulnerability

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/longieirl/seo-audit-template/security/advisories/new).

Include:
- Description of the vulnerability
- Steps to reproduce
- Affected versions or files
- Potential impact

Do not open a public issue for security vulnerabilities.

**Expected response:** acknowledgement within 7 days, resolution timeline within 30 days.

## Push protection bypass policy

Secret scanning push protection can be bypassed by users with write access. This is not permitted unless the detected secret is a confirmed false positive. Any bypass must be reviewed by the repository owner. Bypass events are logged in the repository audit log.

## Known accepted risks

- **Solo-owner auto-approve (Dependabot):** Single maintainer (`@longieirl`). Dependabot PRs for semver-patch/minor are auto-approved and merged without a second human review. Deliberate trade-off for solo-maintained projects. Major version bumps require manual review.
- **Scorecard publishes results publicly:** `publish_results: true` exposes repo posture to scorecard.dev. Accepted for a public repo — findings are not sensitive.
- **`id-token: write` in scorecard workflow:** Required by `ossf/scorecard-action` to publish results. Scoped to the scorecard job only.
- **DCO check skipped for owner:** The `cla.yml` workflow skips DCO verification for `@longieirl` commits. Solo owner — sign-off to oneself is ceremonial.
- **"Require approval from first-time contributors"** is a GitHub UI-only setting (Settings → Actions → General) with no API equivalent. Must be verified manually after setup.
