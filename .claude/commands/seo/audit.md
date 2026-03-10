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

### 1. Derive client folder name

From the URL, derive a short, lowercase, hyphenated client folder name (e.g. `https://birdbrain.ie` → `birdbrain`).

Set `outputDir` to `../seo-strategy/<client-folder-name>`.

### 2. Update config.js

Edit `./config.js` with:
- `siteUrl`: the URL provided
- `serpApiKey`: the API key provided (or keep `process.env.SERP_API_KEY || 'YOUR_SERP_API_KEY'` if none given)
- `searchCountry`: `ie` (default — adjust if the site is clearly not Ireland-based)
- `searchLanguage`: `en`
- `keywords`: leave as placeholders for now — fill in after crawling
- `outputDir`: `../seo-strategy/<client-folder-name>`

### 3. Crawl the site

Run:
```bash
npm run crawl
```

Read the crawled content files in `../seo-strategy/<client-folder-name>/content/` to understand the business, existing topics, and content gaps.

### 4. Choose keywords

Based on what you learned from the crawl, update `config.js` with 15–20 relevant keywords tailored to the client's niche. Each keyword costs 1 SerpAPI credit.

### 5. Run keyword research

```bash
npm run research
```

### 6. Generate the gap report

```bash
npm run report
```

### 7. Write the content strategy

Read the gap report at `../seo-strategy/<client-folder-name>/GAP_REPORT.md`, then write a `SEO_CONTENT_STRATEGY.md` file to `../seo-strategy/<client-folder-name>/SEO_CONTENT_STRATEGY.md` containing:

```
## What Was Done
## Key Findings
## Prioritised Page Recommendations (keyword, why it can rank, competitor gap)
## Quick Wins (no new pages needed)
## Build Order
```

### 8. Export to PDF

```bash
npm run pdf
```

### 9. Reset config.js

Reset `./config.js` back to placeholder defaults:
- `siteUrl`: `'https://your-client-site.com'`
- `serpApiKey`: `process.env.SERP_API_KEY || 'YOUR_SERP_API_KEY'`
- `searchCountry`: `'ie'`
- `searchLanguage`: `'en'`
- `keywords`: `['your keyword one', 'your keyword two', 'your keyword three']`
- `outputDir`: `'./output'`

### 10. Confirm completion

Tell the user the audit is complete and where to find the outputs:
- Strategy doc: `../seo-strategy/<client-folder-name>/SEO_CONTENT_STRATEGY.md`
- PDF: `../seo-strategy/<client-folder-name>/SEO_CONTENT_STRATEGY.pdf`
- Gap report: `../seo-strategy/<client-folder-name>/GAP_REPORT.md`
