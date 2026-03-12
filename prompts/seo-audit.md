# SEO Audit Prompt

Paste this into Claude, ChatGPT, Gemini, or any AI with web search. No setup required.

Replace `[WEBSITE URL]` with your client's site and send.

---

## Prompt

```
You are conducting an SEO audit for [WEBSITE URL].

## Step 1 — Understand the site
Visit the URL and identify:
- The business type, services offered, and target geography
- The main pages and content already published

## Step 2 — Identify keywords
Based on the site's services and location, suggest 15–20 specific search terms a potential customer would use to find this business. Format as a plain list, one keyword per line. Include local variants (e.g. "landscaping dublin", "garden design ireland").

## Step 3 — Gap analysis
For each keyword, identify:
- Whether the site currently ranks for it (yes / no / unknown)
- The top-ranking competitor URL for that term
- 2–3 "People Also Ask" questions related to it
- Whether the site has an existing page that covers it

## Step 4 — Output

Produce two sections:

### Keywords for config.js
A JavaScript array ready to paste into config.js, e.g.:
keywords: [
  'keyword one',
  'keyword two',
]

### Content Gap Report
A markdown table with columns: Keyword | Site Ranks? | Top Competitor | Existing Page Covers It? | PAA Questions

Then list prioritised recommendations — which pages to create or improve first, and why.
```

---

## How to use

1. Copy the prompt above
2. Replace `[WEBSITE URL]` with your client's URL
3. Paste into Claude, ChatGPT, Gemini, or Perplexity (web search gives better results)
4. Copy the `keywords` array from the output into `config.js` — each keyword costs 1 SerpAPI credit
5. Run `npm run audit -- https://yoursite.com YOUR_SERP_API_KEY` to validate with live SERP data

---

## Want it fully automated?

See the [README](../README.md) — the CLI pipeline crawls the site, runs live keyword research via SerpAPI, and generates the gap report automatically.
