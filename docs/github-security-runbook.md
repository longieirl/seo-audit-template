# GitHub Repository Security Runbook

Repeatable steps to secure a new GitHub repository with branch protection and security alerts.

---

## Prerequisites

### Fine-grained Personal Access Token (PAT)

A fine-grained PAT is required with the following **repository permissions**:

| Permission | Level |
|---|---|
| Administration | Read & write |
| Contents | Read & write |
| Pull requests | Read & write |
| Metadata | Read (auto-granted) |

**Create / manage tokens:** https://github.com/settings/personal-access-tokens

Store the token in `.env.local` (already gitignored):

```
GITHUB_TOKEN=github_pat_11...
```

Load it into your shell session:

```bash
export GITHUB_TOKEN=$(grep GITHUB_TOKEN .env.local | cut -d= -f2)
```

---

## 1. Branch Protection on `main`

Requires one approving PR review, passing CI, and no force pushes.

```bash
GH_HOST=github.com gh api \
  --method PUT \
  /repos/<owner>/<repo>/branches/main/protection \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Install & audit"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

**Notes:**
- Replace `<owner>/<repo>` with your values (e.g. `longieirl/seo-audit-template`)
- `contexts` must match the exact job name in your CI workflow (`jobs.<id>.name`)
- `enforce_admins: false` — repo owner retains bypass rights. Set to `true` for stricter enforcement
- `restrictions: null` — no user/team push restrictions (adjust for org repos)

---

## 2. Enable Vulnerability Alerts (Dependabot)

```bash
GH_HOST=github.com gh api --method PUT /repos/<owner>/<repo>/vulnerability-alerts
```

Enables Dependabot security alerts for known CVEs in dependencies.

---

## 3. Enable Automated Security Fixes

```bash
GH_HOST=github.com gh api --method PUT /repos/<owner>/<repo>/automated-security-fixes
```

Dependabot will automatically open PRs to patch vulnerable dependencies.

---

## 4. Verify Protection is Applied

```bash
GH_HOST=github.com gh api /repos/<owner>/<repo>/branches/main/protection --jq '{
  pr_required: .required_pull_request_reviews.required_approving_review_count,
  dismiss_stale: .required_pull_request_reviews.dismiss_stale_reviews,
  codeowner_review: .required_pull_request_reviews.require_code_owner_reviews,
  status_checks: .required_status_checks.contexts,
  strict: .required_status_checks.strict,
  force_push: .allow_force_pushes.enabled,
  deletions: .allow_deletions.enabled
}'
```

Expected output:
```json
{
  "pr_required": 1,
  "dismiss_stale": true,
  "codeowner_review": true,
  "status_checks": ["Install & audit"],
  "strict": true,
  "force_push": false,
  "deletions": false
}
```

---

## 5. Token Rotation

GitHub fine-grained PATs cannot be rotated in place — regenerate instead:

1. Go to https://github.com/settings/personal-access-tokens
2. Find the token and click **Regenerate**
3. Update `.env.local` with the new value
4. Re-export in your shell: `export GITHUB_TOKEN=<new-token>`

> **Never commit `.env.local`** — confirm it is in `.gitignore`

---

## Files referenced in this repo

| File | Purpose |
|---|---|
| `.env.local` | Local secrets (gitignored) — holds `GITHUB_TOKEN` |
| `.github/CODEOWNERS` | Assigns `@longieirl` as required reviewer for all files |
| `.github/dependabot.yml` | Dependabot update schedule |
| `.github/workflows/ci.yml` | Runs `npm ci` + `npm audit` on PRs to main |
| `.github/workflows/cla.yml` | DCO sign-off check for external contributors |
| `.github/workflows/cleanup-branch.yml` | Auto-deletes branches after merge |
| `.github/pull_request_template.md` | Default PR description template |

---

## Checklist for a new repo

- [ ] Create fine-grained PAT with Administration: Read & write
- [ ] Add token to `.env.local`
- [ ] Copy `.github/` directory from this repo
- [ ] Run branch protection command (Step 1)
- [ ] Run vulnerability alerts command (Step 2)
- [ ] Run automated security fixes command (Step 3)
- [ ] Verify with Step 4
