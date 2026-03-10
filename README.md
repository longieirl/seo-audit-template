# SEO Audit Template

Reusable pipeline to crawl any website, research keywords via SerpAPI, generate a content gap report, and export a styled PDF — configured entirely via `config.js`.

---

## Step 1 — Self-host the SerpAPI MCP Server

```bash
git clone https://github.com/serpapi/serpapi-mcp.git
cd serpapi-mcp
uv sync && uv run src/server.py
```

Get your API key at **serpapi.com/manage-api-key**

> Free tier: **250 searches/month**

---

## Step 2 — Open the template in Claude Code CLI

Clone the repo and launch Claude from the project root so it has access to all scripts and config:

```bash
git clone https://github.com/longieirl/seo-audit-template.git
cd seo-audit-template
claude .
```

---

## Step 3 — Run in Claude Code CLI

Copy and paste the following prompt, replacing the URL and API key with your own:

```
Take the existing template project and I want you to help me create an SEO content
strategy for my website [ https://your-client-site.com ].

First, use Playwright to crawl my website and save all the content to markdown files
locally. I want you to understand what topics I've already covered.

Then use SerpAPI to research keywords in my niche. Look at what's ranking, what
questions people are asking, and what my competitors are covering.

Finally, compare my existing content against the opportunities you find. Give me a
prioritised list of new pages I should create, with the keyword, estimated search
volume, and why I have a chance of ranking.

Additional information

SerpAPI Key
YOUR_SERP_API_KEY

Required Output:
- Convert the report SEO_CONTENT_STRATEGY.md into a readable PDF within the same directory
- Show a section `What was Done`
- Show a section `Key Findings`
```

---

## Config

All settings live in **`config.js`**:

```js
module.exports = {
  siteUrl: 'https://your-client-site.com',
  serpApiKey: 'YOUR_SERP_API_KEY',   // or set SERP_API_KEY env variable
  searchCountry: 'ie',               // ie, gb, us, au, etc.
  searchLanguage: 'en',
  keywords: [
    'your keyword one',
    'your keyword two',
    // each keyword = 1 SerpAPI credit
  ],
  outputDir: './output',             // or an absolute path for a named client
};
```

---

## Manual Run (optional)

If you want to run steps individually outside of Claude:

```bash
npm run setup      # one-time: install deps + Playwright browser + Python markdown lib

npm start          # run everything: crawl + research + report
npm run crawl      # Step 1: crawl site       → output/content/
npm run research   # Step 2: keyword research → output/serp/
npm run report     # Step 3: gap report       → output/GAP_REPORT.md
npm run pdf        # Step 5: export PDF       → output/SEO_CONTENT_STRATEGY.pdf
```

> Step 4 is writing `output/SEO_CONTENT_STRATEGY.md` — Claude does this based on the gap report.

---

## Output

```
output/
  content/
    INDEX.md                  ← list of all crawled pages
    <page-slug>.md            ← one file per page
  serp/
    all_results.json          ← all keyword data combined
    <keyword>.json            ← per-keyword SERP results
  GAP_REPORT.md               ← auto-generated content gap report
  SEO_CONTENT_STRATEGY.md     ← written strategy (Claude, Step 4)
  SEO_CONTENT_STRATEGY.pdf    ← exported PDF (Step 5)
```

---

## Tips

- Set `SERP_API_KEY` as an env variable to avoid storing it in `config.js`:
  ```bash
  export SERP_API_KEY=your_key_here
  ```
- Set `outputDir` to an absolute path (e.g. `../seo-strategy/clientname`) to keep client outputs separate from the template
- The crawler uses `domcontentloaded` + a 4-second wait — handles JS-rendered sites (Wix, Squarespace, etc.)
- Re-run individual steps without re-crawling: `npm run report` or `npm run pdf`
