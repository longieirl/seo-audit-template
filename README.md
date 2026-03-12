# SEO Audit Template

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

Crawl any site, research keywords with SerpAPI, generate a content gap report and PDF strategy — all from the CLI in minutes.

**Powered by**&nbsp;&nbsp;
<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_Logo.svg/1024px-OpenAI_Logo.svg.png" alt="" width="0">
<a href="https://claude.ai/code"><img src="https://img.shields.io/badge/Claude_Code-CLI-8A2BE2?logo=anthropic&logoColor=white" alt="Claude Code CLI"></a>&nbsp;
<a href="https://serpapi.com"><img src="https://img.shields.io/badge/SerpAPI-keyword_research-orange?logo=google&logoColor=white" alt="SerpAPI"></a>

---

## Why this tool?

Most SEO audits require juggling Screaming Frog, Ahrefs, Google Sheets, and a copywriter. This template replaces that stack with a single CLI command: crawl → research → gap report → PDF strategy. No SaaS subscription, no browser extension — just Node.js, Python, and a SerpAPI key.

---

## Quick Start

**Requirements:** Node >=18, Python 3, a [SerpAPI key](https://serpapi.com/manage-api-key) (250 free searches/month)

```bash
git clone https://github.com/longieirl/seo-audit-template.git
cd seo-audit-template
npm run setup
```

**Before running the audit**, open `config.js` and set your client's keywords:

```js
keywords: [
  'landscaping dublin',
  'garden design ireland',
  // each keyword = 1 SerpAPI credit
],
```

Then run:

```bash
npm run audit -- https://yoursite.com YOUR_SERP_API_KEY
```

That's it. Output lands in `./<site>-seo/` — see [Output](#output) for the full file tree.

> **Claude Code users:** open the project with `claude .` and run `/seo:audit https://yoursite.com` — Claude picks the keywords for you automatically.

---

## Example output

```
example-seo/
  GAP_REPORT.md               ← auto-generated content gap report
  SEO_CONTENT_STRATEGY.md     ← written strategy (AI mode)
  SEO_CONTENT_STRATEGY.pdf    ← exported PDF
  content/
    INDEX.md                  ← list of all crawled pages
    about-us.md
    blog-post-title.md
  serp/
    all_results.json
    keyword-one.json
```

> **Screenshot placeholder** — add a screenshot of your terminal output or generated PDF here.

---

## AI Mode — Claude Code (recommended)

> **Requirements:** Claude Code requires a paid Claude account (Pro, Team, or Enterprise). Free Claude accounts do not have access to Claude Code CLI.

For a fully automated run where Claude picks the best keywords, writes the strategy document, and exports the PDF:

### 1 — Start the SerpAPI MCP server

```bash
git clone https://github.com/serpapi/serpapi-mcp.git
cd serpapi-mcp
uv sync && uv run src/server.py
```

Leave this running in a separate terminal tab.

### 2 — Run the audit skill

```bash
claude .
```

Then:

```
/seo:audit https://yoursite.com YOUR_SERP_API_KEY
```

If `SERP_API_KEY` is already exported, the key argument is optional:

```
/seo:audit https://yoursite.com
```

Claude verifies the MCP server, crawls the site, chooses keywords, runs research, writes the strategy, and exports a PDF — automatically.

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
  SEO_CONTENT_STRATEGY.md     ← written strategy (AI mode only)
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

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All contributions require a DCO sign-off (`git commit -s`).

---

## License

[MIT](./LICENSE) © [J Long](https://github.com/longieirl)
