# SEO Audit Template

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
<a href="https://claude.ai/code"><img src="https://img.shields.io/badge/Claude_Code-CLI-8A2BE2?logo=anthropic&logoColor=white" alt="Claude Code CLI"></a>&nbsp;
<a href="https://serpapi.com"><img src="https://img.shields.io/badge/SerpAPI-keyword_research-orange?logo=google&logoColor=white" alt="SerpAPI"></a>

Crawl any site, research keywords with SerpAPI, generate a content gap report and PDF strategy — all from the CLI in minutes. No SaaS subscription, no browser extension.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org) | >=18 | Runtime for all pipeline scripts |
| [Python](https://www.python.org/downloads/) | >=3.9 | Required for PDF export only |
| [pip](https://pip.pypa.io/en/stable/installation/) | any | Installs `markdown` and `playwright` Python packages |
| [SerpAPI key](https://serpapi.com/manage-api-key) | — | 250 free searches/month; each keyword costs 1 credit |

After cloning, run `npm run setup` — this installs all Node and Python dependencies and downloads the Playwright Chromium browser used for both crawling and PDF export.

If the Playwright Python browser was not installed by setup, run:

```bash
playwright install chromium
```

---

## Quick Start

```bash
git clone https://github.com/longieirl/seo-audit-template.git
cd seo-audit-template
npm run setup
npm run audit -- https://yoursite.com YOUR_SERP_API_KEY
```

Output lands in `./<site>-seo/`. If your `config.js` still has placeholder keywords, the tool will automatically suggest keywords extracted from the crawled content and prompt you to pick the ones you want.

> **Claude Code users:** the `/seo:audit` skill is bundled in this repo. Run `claude` in the project directory, then `/seo:audit https://yoursite.com` — Claude handles keywords and strategy automatically. Requires a paid Claude account.

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

The `/seo:audit` skill is bundled in this repo at `.claude/commands/seo/audit.md`. Claude Code automatically loads it when you open the project — no plugin installation required.

For a fully automated run (keyword selection, strategy doc, PDF export):

### Option A — With SerpAPI MCP server (recommended)

The MCP server lets Claude call SerpAPI directly as a tool, without needing the API key passed as an argument.

**1 — Start the MCP server** (once, in a separate terminal tab):

```bash
git clone https://github.com/serpapi/serpapi-mcp.git
cd serpapi-mcp
uv sync && uv run src/server.py
```

The server runs at `http://localhost:8000/{YOUR_API_KEY}/mcp`. Leave it running.

**2 — Run the audit:**

```bash
claude
/seo:audit https://yoursite.com
```

Claude detects the MCP server, uses it for all keyword research, and completes the full pipeline automatically.

### Option B — Direct API key (no MCP server needed)

Pass the key as a second argument or set it as an environment variable:

```bash
export SERP_API_KEY=your_key_here
claude
/seo:audit https://yoursite.com
```

> Both options require a paid Claude account (Pro, Team, or Enterprise).

### Multi-domain audits

Pass multiple domains to audit them in parallel — one agent per domain, all running simultaneously:

```bash
/seo:audit staydingleway.ie thehawthornroomsdingle.com
```

If a completed audit already exists for any domain (`SEO_CONTENT_STRATEGY.md` present in the output folder), you will be asked whether to re-run or skip it before any work begins.

---

## Individual steps

```bash
node run.js crawl    https://yoursite.com
node run.js suggest  https://yoursite.com          # preview keyword suggestions
node run.js research https://yoursite.com YOUR_SERP_API_KEY
node run.js report   https://yoursite.com
python3 generate_pdf.py ./yoursite-com-seo         # pass the output dir explicitly
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

- The crawler handles JS-rendered sites (Wix, Squarespace, etc.). If only the homepage is captured, the content still gives enough signal for keyword selection
- Re-run individual steps without re-crawling: `node run.js report` or `python3 generate_pdf.py ./<site>-seo`
- `npm run pdf` uses the `outputDir` in `config.js` (defaults to `./output`) — pass the path explicitly when using URL-derived output dirs
- All `*-seo/` output folders are gitignored — client data never gets committed
- If `playwright install chromium` was not run after `npm run setup`, the PDF export will fail — run it once to fix

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All contributions require a DCO sign-off (`git commit -s`).

---

## License

[MIT](./LICENSE) © [J Long](https://github.com/longieirl)
