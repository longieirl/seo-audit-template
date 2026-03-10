---
name: seo:audit
description: Run a full SEO content strategy audit for a client website using the seo-audit-template pipeline
allowed-tools:
  - Read
  - Edit
  - Bash
  - Glob
  - Grep
---

Run a full SEO content strategy audit for the given URL using the pipeline in the current project directory.

**Usage:** `/seo:audit <url> [serp-api-key]`

Arguments from the command line: `$ARGUMENTS`

Parse `$ARGUMENTS` as follows:
- First argument: the client site URL (required)
- Second argument: the SerpAPI key (optional — falls back to `SERP_API_KEY` env var)

If no URL is provided, ask the user for it before proceeding.

---

## Instructions

Work from the project root (current working directory). Do not rewrite any scripts — use the tools already in place.

### 1. Verify the SerpAPI MCP server is running

Check that the SerpAPI MCP server is available. Run a test to confirm it is reachable:

```bash
curl -s http://localhost:3000/health 2>/dev/null || echo "not reachable"
```

If it is not reachable, tell the user:

> The SerpAPI MCP server does not appear to be running. Please start it first:
> ```bash
> cd serpapi-mcp
> uv run src/server.py
> ```
> Then re-run `/seo:audit`.

Do not proceed until the server is confirmed reachable.

### 2. Derive client folder name

From the URL, derive a short, lowercase, hyphenated folder name with a `-seo` suffix (e.g. `https://example.ie` → `example-seo`).

Output is written to `./<client>-seo/` inside the project directory. These folders are gitignored.

### 3. Crawl the site

Run crawl only first so you can read the content before choosing keywords:

```bash
node run.js crawl <url>
```

Read the crawled content in `./<client>-seo/content/` to understand the business, existing topics, and content gaps.

### 4. Choose keywords

Based on what you learned from the crawl, update `config.js` with 15–20 relevant keywords tailored to the client's niche. Each keyword costs 1 SerpAPI credit.

### 5. Run keyword research and gap report

```bash
node run.js research <url> <serp-api-key>
node run.js report <url>
```

If no API key was provided as an argument, omit it — the pipeline falls back to the `SERP_API_KEY` env var.

### 6. Write the content strategy

Read the gap report at `./<client>-seo/GAP_REPORT.md`, then write `./<client>-seo/SEO_CONTENT_STRATEGY.md` containing:

```
## What Was Done
## Key Findings
## Prioritised Page Recommendations (keyword, why it can rank, competitor gap)
## Quick Wins (no new pages needed)
## Build Order
```

### 7. Export to PDF

```bash
npm run pdf
```

### 8. Reset config.js keywords

Reset only the `keywords` array in `./config.js` back to placeholders:
```js
keywords: ['your keyword one', 'your keyword two', 'your keyword three'],
```

### 9. Confirm completion

Tell the user the audit is complete and where to find the outputs:
- Strategy doc: `./<client>-seo/SEO_CONTENT_STRATEGY.md`
- PDF: `./<client>-seo/SEO_CONTENT_STRATEGY.pdf`
- Gap report: `./<client>-seo/GAP_REPORT.md`
