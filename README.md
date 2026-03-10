# SEO Audit Template

Reusable tool to crawl any website, research keywords via SerpAPI, generate a content gap report, and export a styled PDF — all from one config file.

---

## Setup (one time)

```bash
cd seo-audit-template
npm run setup
```

This installs Node dependencies, downloads the Playwright Chromium browser, and installs the Python `markdown` library needed for the PDF step.

---

## Configure

Edit **`config.js`** before each run:

```js
module.exports = {
  siteUrl: 'https://your-client-site.com',
  serpApiKey: 'YOUR_SERP_API_KEY',   // or set SERP_API_KEY env variable
  searchCountry: 'ie',               // ie, gb, us, au, etc.
  searchLanguage: 'en',
  keywords: [
    'your keyword one',
    'your keyword two',
    // add as many as needed (each = 1 SerpAPI credit)
  ],
  outputDir: './output',
};
```

---

## Run

```bash
# Run everything (crawl + research + report)
npm start

# Or run steps individually:
npm run crawl      # Step 1: Crawl site → output/content/
npm run research   # Step 2: SerpAPI research → output/serp/
npm run report     # Step 3: Generate gap report → output/GAP_REPORT.md

# Then write and export the strategy:
# Step 4: Write output/SEO_CONTENT_STRATEGY.md (manually, based on the gap report)
npm run pdf        # Step 5: Export SEO_CONTENT_STRATEGY.md → output/SEO_CONTENT_STRATEGY.pdf
```

---

## Output

```
output/
  content/
    INDEX.md                  ← list of all crawled pages
    <page-slug>.md            ← one file per page
  serp/
    all_results.json          ← all keyword data combined
    <keyword>.json            ← per-keyword results
  GAP_REPORT.md               ← auto-generated content gap report
  SEO_CONTENT_STRATEGY.md     ← written strategy (Step 4)
  SEO_CONTENT_STRATEGY.pdf    ← exported PDF (Step 5)
```

---

## Re-using for a new client

1. Edit `config.js` with the new site URL, API key, and keywords
2. Delete the `output/` folder contents (or they will be overwritten)
3. Run `npm start`
4. Write `output/SEO_CONTENT_STRATEGY.md` based on the gap report
5. Run `npm run pdf` to export

---

## Tips

- **SerpAPI free tier** gives 100 searches/month — enough for ~6 audits of 15 keywords each
- Set `SERP_API_KEY` as an environment variable to avoid storing the key in config.js:
  ```bash
  export SERP_API_KEY=your_key_here
  npm start
  ```
- The crawler uses `domcontentloaded` + a 4-second wait, which handles JS-rendered sites (Wix, Squarespace, etc.)
- Run steps individually to re-generate just the report without re-crawling
