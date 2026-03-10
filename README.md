# SEO Audit Template

Crawl any website, research keywords via SerpAPI, generate a content gap report, and export a styled PDF — all from a single command.

---

## Prerequisites

### 1 — Clone and run the SerpAPI MCP server

The pipeline uses SerpAPI for keyword research. Self-host the MCP server locally:

```bash
git clone https://github.com/serpapi/serpapi-mcp.git
cd serpapi-mcp
uv sync && uv run src/server.py
```

Get your API key at **serpapi.com/manage-api-key**

> Free tier: **250 searches/month**

Leave this running in a terminal tab.

### 2 — Clone this repo and install dependencies

```bash
git clone https://github.com/longieirl/seo-audit-template.git
cd seo-audit-template
npm run setup
```

`npm run setup` installs Node dependencies, the Playwright browser, and the Python PDF library.

---

## Running an audit

### Option A — Claude Code (recommended)

Open the project in Claude Code CLI and use the built-in skill:

```bash
claude .
```

Then run:

```
/seo:audit https://yoursite.com YOUR_SERP_API_KEY
```

Claude will verify the SerpAPI MCP server is reachable, crawl the site, choose keywords, run research, write the strategy, and export a PDF — all automatically.

If `SERP_API_KEY` is already set as an environment variable, the key argument is optional:

```
/seo:audit https://yoursite.com
```

### Option B — Command line

```bash
npm run audit -- https://yoursite.com YOUR_SERP_API_KEY
```

Or set the key as an env variable and omit it:

```bash
export SERP_API_KEY=your_key_here
npm run audit -- https://yoursite.com
```

Output is written to `./<site>-seo/` inside the project directory (gitignored).

---

## Output

```
<site>-seo/
  content/
    INDEX.md                  ← list of all crawled pages
    <page-slug>.md            ← one file per page
  serp/
    all_results.json          ← all keyword data combined
    <keyword>.json            ← per-keyword SERP results
  GAP_REPORT.md               ← auto-generated content gap report
  SEO_CONTENT_STRATEGY.md     ← written strategy (Claude, Option A only)
  SEO_CONTENT_STRATEGY.pdf    ← exported PDF
```

---

## Individual steps

Run steps separately if needed:

```bash
node run.js crawl    https://yoursite.com
node run.js research https://yoursite.com YOUR_SERP_API_KEY
node run.js report   https://yoursite.com
npm run pdf
```

---

## Config

Default settings live in `config.js` and are used as a base. CLI arguments always take precedence:

```js
module.exports = {
  siteUrl: 'https://your-client-site.com',
  serpApiKey: process.env.SERP_API_KEY || 'YOUR_SERP_API_KEY',
  searchCountry: 'ie',   // ie, gb, us, au, etc.
  searchLanguage: 'en',
  keywords: [
    'your keyword one',
    'your keyword two',
    // each keyword = 1 SerpAPI credit
  ],
  outputDir: './output',
};
```

---

## Tips

- The crawler uses `domcontentloaded` + a 4-second wait — handles JS-rendered sites (Wix, Squarespace, etc.)
- Re-run individual steps without re-crawling: `node run.js report` or `npm run pdf`
- All `*-seo/` output folders are gitignored — client data never gets committed

---

## License

[MIT](./LICENSE) © [J Long](https://github.com/longieirl)
