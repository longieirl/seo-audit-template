# CLI Packaging — Design Spec

**Date:** 2026-04-12
**Scope:** Phase 2 — CLI entry point and npm publish as `@longieirl/seo-audit`
**Status:** Approved

---

## Problem

The tool is a git-clone-and-run local script. There is no `npx seo-audit` invocation, no published npm package, and no `--help` output. Users must clone the repo, read the README, and manually wire up `node run.js`. This is a high friction barrier for adoption.

---

## Scope: Phase 2 First (CLI Packaging)

The user has chosen to deliver CLI packaging before the programmatic JSON API. This means:

- `npx @longieirl/seo-audit https://example.com` works
- The tool runs the existing pipeline exactly as today
- No structural refactoring of scripts (the JSON API layer is Phase 3)
- The API key handling is improved (env var primary, no positional arg in CLI)
- A proper npm publish workflow is added

**Phase 3 (JSON API) comes after this.** Building the CLI first means `run.js` remains the entry point for humans; `api.js` will be added later for programmatic use.

---

## Section 1: `package.json` Changes

### Name

**`@longieirl/seo-audit`** (scoped, public)

- Namespaced under the author's GitHub identity (consistent with CODEOWNERS)
- `seo-audit` (unscoped) is available but scoped is cleaner for long-term ownership
- `seo-audit-tool` is already taken on the registry (v1.1.3, an MCP server)

### Version

**`0.1.0`** — the current `1.0.0` was appropriate for a git template but is too assertive for a first npm registry publish with no stable programmatic API yet. Promote to `1.0.0` after the JSON API (Phase 3) is complete.

### Required additions

```json
{
  "name": "@longieirl/seo-audit",
  "version": "0.1.0",
  "bin": {
    "seo-audit": "./run.js"
  },
  "main": "./run.js",
  "files": [
    "run.js",
    "scripts/",
    "config.js",
    "generate_pdf.py",
    "README.md"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

### What `files` excludes (auto-excluded, not in allowlist)

- `.claude/` — AI session data, commands, hooks
- `.github/` — CI workflows, CODEOWNERS
- `.planning/` — design docs
- `docs/` — specs and handoffs
- `CLAUDE.md` — internal AI instructions
- `CONTRIBUTING.md` — development-only
- `node_modules/` — always excluded by npm
- `*-seo/` output directories

---

## Section 2: `run.js` Changes

### Shebang line

Add as the **first line** of `run.js`:

```
#!/usr/bin/env node
```

This is required for `bin` entry points to execute directly (`seo-audit https://...`) without `node` prefix. `node run.js` continues to work unchanged.

### `--help` flag

When `process.argv.includes('--help') || process.argv.includes('-h')`, print usage and exit 0:

```
Usage: seo-audit [step] <url> [options]

Steps:
  all (default)   Run full pipeline: crawl → research → report
  crawl           Crawl the site and save pages as Markdown
  link-audit      Analyse internal link graph (requires crawl)
  suggest         Extract keyword suggestions from crawled content
  research        Query SerpAPI for each keyword
  report          Generate GAP_REPORT.md from research results

Options:
  --help, -h      Show this help
  --version, -v   Show version
  --no-pdf        Skip PDF export (no Python required)
  --auto          Auto-select keywords without interactive prompt

Environment:
  SERP_API_KEY    SerpAPI key (required for research step)

Examples:
  seo-audit https://example.com
  seo-audit crawl https://example.com
  SERP_API_KEY=xxx seo-audit https://example.com
```

### `--version` flag

When `process.argv.includes('--version') || process.argv.includes('-v')`, print `require('./package.json').version` and exit 0.

### `--no-pdf` flag

When `process.argv.includes('--no-pdf')`, skip the `generate_pdf.py` call in the pipeline. This removes the Python dependency from the happy path for users who only need the Markdown strategy doc.

The PDF step is currently not in `run.js` — it is a separate `npm run pdf` script. This flag is a no-op for the initial release but is included in `--help` output for discoverability. The PDF step integration into `run.js` is a future enhancement.

### SerpAPI key handling

**Remove positional API key argument from the published CLI.** The current `node run.js research url KEY` pattern exposes the key in shell history. The packaged CLI uses:

1. `SERP_API_KEY` environment variable (primary)
2. `.env` file in the current working directory (loaded by a small inline reader — no `dotenv` dependency)
3. If neither is set and the research step is requested: emit a clear error with the serpapi.com/manage-api-key URL and exit 1

**Backwards compatibility:** The `node run.js research https://example.com MY_KEY` invocation (positional arg) continues to work for existing local users. The packaged CLI docs promote env var usage; the positional arg is deprecated but not removed.

### `.env` file reader (no new dependency)

```js
// Inline at top of run.js, before buildConfig:
function loadDotEnv() {
  try {
    const lines = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z_]+)=(.+)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadDotEnv();
```

This reads only `KEY=VALUE` lines (uppercase env var pattern), skips comments, and does not override existing env vars. No `dotenv` dependency required.

---

## Section 3: npm Publish Workflow

### `.github/workflows/npm-publish.yml` (new file)

Triggered on GitHub Release creation (tag push via GitHub UI):

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

`--provenance` links the published package to the GitHub commit (supply chain transparency, free for public packages).

### Required GitHub secret

`NPM_TOKEN` must be added to the repo secrets (Settings → Secrets → Actions). The token is an npm Automation token scoped to the `@longieirl` org. This is a manual one-time step outside the codebase.

### First publish

`npm publish --access public` from a local machine with `NPM_TOKEN` set, before the CI workflow exists. Establishes the package name on the registry. All subsequent publishes via CI.

---

## Section 4: README Updates

The existing README needs an **Installation & Usage** section prepended before the current "Quick Start":

```markdown
## Install

```bash
# Run without installing (one-time ~170MB browser download on first run):
npx @longieirl/seo-audit https://example.com

# Or install globally:
npm install -g @longieirl/seo-audit
seo-audit https://example.com
```

> **First-time note:** This tool uses Playwright Chromium to crawl JavaScript-rendered sites.
> The browser binary (~170MB) downloads automatically on first run. Subsequent runs are instant.

### SerpAPI key required for research

```bash
# Set as environment variable (recommended — keeps key out of shell history):
export SERP_API_KEY=your_key_here
seo-audit https://example.com

# Or add to a .env file in your project directory:
echo "SERP_API_KEY=your_key_here" > .env
seo-audit https://example.com
```

### PDF export (optional)

PDF generation requires Python 3 + `pip install markdown playwright`. Skip it with `--no-pdf`:

```bash
seo-audit https://example.com --no-pdf
```
```

---

## Section 5: Breaking Changes

| Change | Impact on existing users |
|---|---|
| Shebang added to `run.js` | None — `node run.js` still works |
| `bin` field in `package.json` | None — git clone users unaffected |
| `files` field in `package.json` | None — git clone users get all files regardless |
| Version changed to `0.1.0` | None — no npm consumers yet |
| `.env` loading added to `run.js` | Additive only — no override if env var already set |
| Positional SerpAPI key deprecated (not removed) | Zero — still works; only docs change |
| `generateReport` return value | Not in this phase — Phase 3 concern |

No breaking changes for current clone-and-run users.

---

## Files to Modify / Create

| File | Change |
|---|---|
| `package.json` | Name, version, bin, files, publishConfig |
| `run.js` | Shebang, --help, --version, --no-pdf flag (no-op), .env loader |
| `README.md` | Installation section, npx usage, SerpAPI env var docs, browser download warning |
| `.github/workflows/npm-publish.yml` | New — publish on GitHub Release |

No new npm dependencies.

---

## Playwright Browser Download

**This is the most important UX risk.** First-time `npx @longieirl/seo-audit` users experience a silent ~170MB Chromium download before the tool runs. Playwright's downloader prints its own progress; the README must set this expectation explicitly.

`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` can suppress the download for users who manage browser installs separately (e.g. CI environments with Playwright already installed system-wide). This is documented in the README as an advanced option.
