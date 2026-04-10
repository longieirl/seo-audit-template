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

## Multi-Domain Mode

When `$ARGUMENTS` contains two or more URLs, this skill runs in **multi-domain mode**. Single-URL invocations skip this section entirely and follow the single-domain instructions below unchanged.

### Argument parsing

Split `$ARGUMENTS` on whitespace. Classify each token:

- URL token — contains a `.` and no spaces, optionally prefixed with `http://` or `https://`. Normalise bare domains by prepending `https://` (e.g. `staydingleway.ie` → `https://staydingleway.ie`).
- API key token — the last token that is NOT a URL. Use as the SerpAPI key. Falls back to `SERP_API_KEY` env var or `config.js` if absent.

Mode selection:
- 1 URL → skip this section, proceed to single-domain instructions below
- 2+ URLs → continue with multi-domain steps below

_(Steps A, B, and C will be added below.)_

### Single-domain mode

If only one URL is provided, skip the multi-domain steps above. The single-domain flow begins here:

Run a full SEO content strategy audit for the given URL using the pipeline in the current project directory.

**Usage:** `/seo:audit <url> [serp-api-key]`

Arguments from the command line: `$ARGUMENTS`

Parse `$ARGUMENTS` as follows:
- First argument: the client site URL (required)
  Normalise bare domains by prepending https:// (e.g. staydingleway.ie → https://staydingleway.ie).
- Second argument: the SerpAPI key (optional — falls back to `SERP_API_KEY` env var)

If no URL is provided, ask the user for it before proceeding.

---

## Instructions

Work from the project root (current working directory). Do not rewrite any scripts — use the tools already in place.

### 1. Determine research mode

There are two ways to run keyword research. Prefer MCP if the server is available.

**Option A — SerpAPI MCP server (preferred)**

Check if the MCP server is running:

```bash
curl -s http://localhost:8000/health 2>/dev/null || echo "not reachable"
```

If reachable, the server responds with a JSON error asking for an API key — that means it's up. Use the MCP `search` tool directly for all keyword research in step 5 instead of running `node run.js research`. The MCP server URL format is:

```
http://localhost:8000/{SERP_API_KEY}/mcp
```

If it is not reachable, tell the user they can optionally start it:
```bash
git clone https://github.com/serpapi/serpapi-mcp.git
cd serpapi-mcp
uv sync && uv run src/server.py
```
Then fall back to Option B.

**Option B — Direct API key (fallback)**

Check for a key in this order:

1. Second argument passed to the skill (e.g. `/seo:audit https://site.com MY_KEY`)
2. `SERP_API_KEY` environment variable
3. `serpApiKey` field already set in `config.js`

If none are present, tell the user:

> No SerpAPI key found. Either start the MCP server or provide a key:
> ```bash
> export SERP_API_KEY=your_key_here
> ```
> Then re-run `/seo:audit`.

Do not proceed without either the MCP server or an API key.

### 2. Derive client folder name

From the URL, derive a short, lowercase, hyphenated folder name with a `-seo` suffix (e.g. `https://example.ie` → `example-seo`).

Output is written to `./<client>-seo/` inside the project directory. These folders are gitignored.

### 3. Crawl the site

Run crawl only first so you can read the content before choosing keywords:

```bash
node run.js crawl <url>
```

Read the crawled content in `./<client>-seo/content/` to understand the business, existing topics, and content gaps.

If the crawler only captures the homepage (common on heavily JS-rendered sites like Wix or Squarespace), supplement by fetching the live site with the WebFetch tool to extract the full property/product/service inventory before choosing keywords.

### 4. Choose keywords

Based on what you learned from the crawl, update `config.js` with 15–20 relevant keywords tailored to the client's niche. Each keyword costs 1 SerpAPI credit.

### 5. Run keyword research and gap report

**If using MCP (Option A):** Call the MCP `search` tool directly for each keyword — do not run `node run.js research`. For each keyword, call the tool with:

```json
{
  "params": {
    "engine": "google",
    "q": "<keyword>",
    "gl": "<searchCountry>",
    "hl": "<searchLanguage>",
    "num": "10"
  },
  "mode": "compact"
}
```

Save the results manually to `./<client>-seo/serp/<keyword>.json` in the same format `research.js` produces (fields: `keyword`, `organic`, `people_also_ask`, `related_searches`), then write `all_results.json` combining all keywords. This allows `report.js` to run unchanged.

**If using direct API key (Option B):**

```bash
node run.js research <url> <serp-api-key>
```

If no API key was provided as an argument, omit it — the pipeline falls back to the `SERP_API_KEY` env var.

**Then run the gap report (both options):**

```bash
node run.js report <url>
```

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

Pass the client output directory explicitly — `npm run pdf` defaults to `./output` and will fail for URL-derived output dirs:

```bash
python3 generate_pdf.py ./<client>-seo
```

If Playwright's Python Chromium is not installed, run this first:

```bash
playwright install chromium
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
