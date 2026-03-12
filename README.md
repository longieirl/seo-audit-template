# SEO Audit Template

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
<a href="https://claude.ai/code"><img src="https://img.shields.io/badge/Claude_Code-CLI-8A2BE2?logo=anthropic&logoColor=white" alt="Claude Code CLI"></a>&nbsp;
<a href="https://serpapi.com"><img src="https://img.shields.io/badge/SerpAPI-keyword_research-orange?logo=google&logoColor=white" alt="SerpAPI"></a>

Crawl any site, research keywords with SerpAPI, generate a content gap report and PDF strategy — all from the CLI in minutes. No SaaS subscription, no browser extension.

---

## Quick Start

**Requirements:** Node >=18, Python 3, a [SerpAPI key](https://serpapi.com/manage-api-key) (250 free searches/month — each keyword costs 1 credit)

```bash
git clone https://github.com/longieirl/seo-audit-template.git
cd seo-audit-template
npm run setup
npm run audit -- https://yoursite.com YOUR_SERP_API_KEY
```

Output lands in `./<site>-seo/`. If your `config.js` still has placeholder keywords, the tool will automatically suggest keywords extracted from the crawled content and prompt you to pick the ones you want.

> **Claude Code users:** run `/seo:audit https://yoursite.com` — Claude handles keywords and strategy automatically. Requires a paid Claude account.

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

## Just want a quick AI audit?

No setup needed. Open [`prompts/seo-audit.md`](./prompts/seo-audit.md), copy the prompt, replace `[WEBSITE URL]`, and paste it into Claude, ChatGPT, Gemini, or any AI with web search. You'll get a competitor analysis, SEO gap report, and prioritised recommendations in minutes.

---

## AI Mode — Claude Code

For a fully automated run (keyword selection, strategy doc, PDF export):

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
/seo:audit https://yoursite.com YOUR_SERP_API_KEY
```

Claude crawls the site, picks keywords, runs research, writes the strategy, and exports a PDF — automatically.

> Requires a paid Claude account (Pro, Team, or Enterprise).

---

## Individual steps

```bash
node run.js crawl    https://yoursite.com
node run.js suggest  https://yoursite.com          # preview keyword suggestions
node run.js research https://yoursite.com YOUR_SERP_API_KEY
node run.js report   https://yoursite.com
npm run pdf
```

Add `--auto` to the `suggest` or `research` step to skip the interactive prompt.

---

## Config

Settings live in `config.js`. CLI arguments always take precedence:

```js
module.exports = {
  siteUrl: 'https://your-client-site.com',
  serpApiKey: process.env.SERP_API_KEY || 'YOUR_SERP_API_KEY',
  searchCountry: 'ie',   // ie, gb, us, au, etc.
  searchLanguage: 'en',
  keywords: [
    'your keyword one',  // leave as-is to trigger auto-suggest
  ],
  outputDir: './output',
};
```

---

## Tips

- The crawler handles JS-rendered sites (Wix, Squarespace, etc.)
- Re-run individual steps without re-crawling: `node run.js report` or `npm run pdf`
- All `*-seo/` output folders are gitignored — client data never gets committed

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All contributions require a DCO sign-off (`git commit -s`).

---

## License

[MIT](./LICENSE) © [J Long](https://github.com/longieirl)
