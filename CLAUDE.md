# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

ALWAYS before making any change, search the web for the newest documentation and only implement if you are 100% sure it will work.

## Commands

```bash
npm run setup       # install deps, install Playwright Chromium, pip install markdown + playwright
npm run audit -- https://yoursite.com YOUR_SERP_API_KEY   # full pipeline: crawl → research → report

# Individual steps
node run.js crawl      https://yoursite.com
node run.js link-audit https://yoursite.com           # orphan/weak/overlinked page analysis → LINK_AUDIT.md
node run.js suggest    https://yoursite.com [--auto]  # keyword suggestions from crawled content
node run.js research   https://yoursite.com YOUR_SERP_API_KEY
node run.js report     https://yoursite.com
npm run pdf                                           # export SEO_CONTENT_STRATEGY.md → PDF

# Dependency security check (required to pass before merging)
npm audit --audit-level=high
```

There are no automated tests. Validate changes by running the relevant step against a real URL.

## Architecture

The pipeline is a linear sequence of independent scripts, each reading from and writing to `{outputDir}/`:

```
run.js  ──►  scripts/crawl.js         →  {outputDir}/content/*.md
                                          {outputDir}/content/link-graph.json
        ──►  scripts/link-audit.js    →  {outputDir}/LINK_AUDIT.md
        ──►  scripts/suggest-keywords.js  (auto-triggered when keywords are placeholders)
        ──►  scripts/research.js       →  {outputDir}/serp/*.json
        ──►  scripts/report.js         →  {outputDir}/GAP_REPORT.md
        ──►  generate_pdf.py           →  {outputDir}/<domain>-seo-strategy.pdf
```

**`run.js`** — CLI entrypoint. Parses `[step] [url] [serpApiKey]` args, merges them over `config.js`, derives `outputDir` from the URL hostname (`./example-ie-seo/`), and calls each script in sequence. `config` is a `const`; `suggestKeywords` returns an updated copy assigned to `researchConfig` locally.

**`scripts/crawl.js`** — Playwright Chromium crawler. Visits pages with `domcontentloaded` + 4s wait (handles JS-rendered sites). Converts body HTML to Markdown via Turndown, stripping nav/header/footer/script. Saves one `.md` per page plus `INDEX.md` and `link-graph.json` (body-content internal links per page).

**`scripts/link-audit.js`** — Reads `link-graph.json` and classifies pages as orphan (0 inbound body links), weak (≤ threshold), or overlinked (> avg × multiplier). Outputs `LINK_AUDIT.md`. Thresholds configurable via `weakPageThreshold` and `overlinkedMultiplier` in `config.js`.

**`scripts/suggest-keywords.js`** — Reads all `.md` files in `{outputDir}/content/` (except `INDEX.md`). Extracts H2 headings (primary signal), H3 headings, and page titles. Normalises, deduplicates, filters stopwords, and appends geo variants for known country codes (`ie`→`ireland`, `gb`→`uk`, etc.). Prompts the user interactively via `readline/promises`, or auto-selects the top 20 when `--auto` is passed or stdin is not a TTY.

**`scripts/research.js`** — Queries SerpAPI for each keyword (1 req/sec rate limit). Saves per-keyword JSON and `all_results.json` with organic results, People Also Ask, and related searches.

**`scripts/report.js`** — Reads `INDEX.md` and `all_results.json`. Identifies gaps by checking whether each keyword appears in any existing page title or URL. Outputs `GAP_REPORT.md`.

**`generate_pdf.py`** — Python script (separate from Node pipeline). Reads `SEO_CONTENT_STRATEGY.md` from the output dir and exports to PDF using the `markdown` + `playwright` Python packages.

**`config.js`** — Single source of defaults. All CLI args override it. Leaving `keywords` as placeholders triggers `suggestKeywords` automatically on `research` or `all` steps.

## Key conventions

- **No new npm dependencies.** Keep it plain Node.js 18+ built-ins + the existing `playwright-chromium` and `turndown` deps.
- **Output dirs are gitignored.** All `*-seo/` folders are excluded — never commit client data.
- **Reset `config.js` keywords to placeholders** before committing (`'your keyword one'` etc.).
- **All commits require DCO sign-off:** `git commit -s`
- **`@longieirl` is required reviewer** for all PRs (enforced via CODEOWNERS).
- CI runs `npm ci` + `npm audit --audit-level=high` on every PR to main.

## AI mode (`/seo:audit`)

The `.claude/commands/seo/audit.md` command runs the full pipeline automatically: crawls the site, reads content to pick keywords, updates `config.js`, runs research and report, writes `SEO_CONTENT_STRATEGY.md`, exports PDF, then resets `config.js` keywords. Requires the SerpAPI MCP server running at `localhost:3000`.
