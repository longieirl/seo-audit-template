# Internal Link Graph Analysis — Design Spec

**Date:** 2026-04-12
**Scope:** Body-content internal links only — nav/header/footer excluded
**Status:** Approved

---

## Problem

The current pipeline crawls every page and builds a BFS queue from `a[href]` links but immediately discards the source-page mapping. The adjacency map (which page links to which) is never persisted. Without it the tool cannot answer:

- Which pages have **zero inbound body links** (orphans — effectively invisible to search engines)?
- Which pages have only **1–2 inbound body links** (weak — under-supported in body content)?
- Which pages receive a **disproportionate share** of body links (overlinked — masking equity distribution)?

This is among the highest-ROI SEO fixes: it is free, entirely within the site owner's control, and fixing orphan pages converts zero-traffic pages to rankable pages.

---

## Scope Decision: Body Links Only

Nav/header/footer links are excluded from the graph. Rationale:

- Navigation menus give every top-level page ~N inbound links on an N-page site. Counting them makes the "weak page" threshold meaningless — everything looks well-linked via nav while the real signal (no body content links to this page) is hidden.
- The Turndown configuration already strips `nav`, `header`, `footer` from saved `.md` files, confirming the project's view that these elements are structural noise, not content.
- Body-only links reflect deliberate editorial linking decisions — the signal that actually tells Googlebot "this page matters in context."

**Edge case caveat:** Some sites place editorial links inside a `<header>` (e.g. featured-post banners). These will be missed. This is acceptable for v1; body/nav boundary refinement is a future enhancement.

---

## Solution Overview

Two changes, fully decoupled:

1. **Enrich `crawl.js`** to record body-only links per page and write `link-graph.json` to `{outputDir}/content/`.
2. **Add `scripts/link-audit.js`** — a pure Node.js analysis step that reads `link-graph.json` and writes `LINK_AUDIT.md`.

The BFS queue in `crawl.js` is unchanged — it continues to use all `a[href]` links including nav. Only the graph recording is restricted to body content.

---

## Section 1: Data Model

### `link-graph.json` schema

Written to `{outputDir}/content/link-graph.json` by the enriched `crawl.js`:

```json
{
  "https://example.com/": [
    "https://example.com/services/",
    "https://example.com/contact/"
  ],
  "https://example.com/services/": [
    "https://example.com/",
    "https://example.com/contact/"
  ]
}
```

- **Keys:** the `from` URL (fragment-stripped, same-domain only, normalised)
- **Values:** deduplicated array of `to` URLs matching the same normalisation
- **Excluded from values:** self-links, external links, `mailto:`, `tel:`, fragment-only links
- Self-links are excluded from the graph but the page still appears as a key

In-memory analysis structures (`inbound`, `outbound`, `inboundSources`) are derived in `link-audit.js` and not persisted.

---

## Section 2: `crawl.js` Changes

### Capture point

During the Playwright crawl loop, after the existing `page.$$eval('a[href]', ...)` call (which feeds the BFS queue), add a second targeted eval restricted to the document `<body>`:

```js
const bodyLinks = await page.$$eval('body a[href]', as => as.map(a => a.href)).catch(() => []);
```

The existing BFS queue population continues to use `links` (all DOM links). Only `bodyLinks` populates the graph.

### Normalisation (consistent with existing crawl.js patterns)

For each body link:
1. Parse with `new URL(link)` — skip malformed URLs
2. Strip fragment: `.href.split('#')[0]`
3. Skip if `hostname !== siteHostname`
4. Skip `mailto:` and `tel:` schemes
5. Skip if the result equals the current page URL (self-link)

### Graph construction

```js
// Before the while loop:
const graph = {};

// Inside the loop, after bodyLinks collection:
graph[url] = [...new Set(
  bodyLinks
    .filter(l => { ... /* normalisation above */ })
    .map(l => new URL(l).href.split('#')[0])
)];

// After the while loop, before browser.close():
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'link-graph.json'),
  JSON.stringify(graph, null, 2)
);
```

### Minimal impact

- Adds one `page.$$eval` call per page (same network round-trip, DOM already loaded)
- Adds one `fs.writeFileSync` call after the crawl loop completes
- No new npm dependencies
- Existing return value of `crawl()` is unchanged

---

## Section 3: `scripts/link-audit.js`

A pure-JS analysis module. No browser, no network calls.

### Algorithm

```
1. Read link-graph.json
2. Build inbound map: for each (from, toList), increment inbound[to] and record source
3. Classify each page:
   - Orphan:     inbound count === 0  (exclude seed URL / homepage)
   - Weak:       inbound count 1–2    (configurable via config.weakPageThreshold, default 2)
   - Overlinked: inbound count > (avg × overlinkedMultiplier), default multiplier 2
                 (avg = total inbound links / (totalPages − 1), excluding homepage)
4. Write LINK_AUDIT.md
```

### Homepage handling

The homepage (`config.siteUrl`, normalised) is excluded from orphan and overlinked classification. It always tops inbound counts because every page's body may link back to it. It is reported in a separate "Homepage" section with its raw count and an explanatory note.

### Classification thresholds

| Class | Threshold | Configurable |
|---|---|---|
| Orphan | 0 inbound body links | No (objective) |
| Weak | ≤ `config.weakPageThreshold` (default: 2) | Yes — add to `config.js` |
| Overlinked | > avg × `config.overlinkedMultiplier` (default: 2) | Yes — add to `config.js` |

### `LINK_AUDIT.md` sections

1. **Summary table** — total pages, avg body inbound, orphan count, weak count, overlinked count
2. **Orphan pages** — listed with: URL, title (from INDEX.md), actionable fix ("Add a link from an existing related page")
3. **Weak pages** — listed with: URL, inbound count, source pages that already link to it
4. **Overlinked pages** — listed with: URL, inbound count, multiplier vs average
5. **Homepage** — raw count + explanation of exclusion
6. **Full page table** — all URLs, inbound body count, outbound body count, classification
7. **Recommendations** — numbered, actionable ("Add internal links to the following orphan pages from these candidate pages: ...")
8. **Limitations note** — "Body-content links only. Nav/header/footer links are excluded. A page may be well-linked via navigation but still appear as an orphan here — check your navigation structure separately."

---

## Section 4: Pipeline Integration

### run.js step name: `link-audit`

```
crawl         →  content/*.md, INDEX.md, link-graph.json  (NEW)
link-audit    →  LINK_AUDIT.md                            (NEW)
suggest
research      →  serp/*.json
report        →  GAP_REPORT.md
```

```js
// run.js additions:
const { linkAudit } = require('./scripts/link-audit');

if (step === 'link-audit' || step === 'all') {
  console.log('\n--- Step 1b: Link graph analysis ---');
  linkAudit(config);
}
```

Standalone: `node run.js link-audit https://yoursite.com`

`link-audit` runs after `crawl` (depends on `link-graph.json`) but has no dependency on the SerpAPI research step. It can be re-run without re-crawling. The `all` step runs it automatically.

### Missing `link-graph.json` guard

Per the pattern in `suggest-keywords.js` lines 156–162:

```js
if (!fs.existsSync(graphPath)) {
  console.error('ERROR: link-graph.json not found. Run the crawl step first.');
  process.exit(1);
}
```

---

## Section 5: Error Handling and Edge Cases

| Case | Handling |
|---|---|
| Page with zero outbound body links | Reported in full table; not classified as error |
| External links | Excluded by hostname check |
| Self-links | Excluded from edge list |
| Fragment links | Fragment stripped before processing |
| Redirect chains | Playwright resolves redirects automatically; final URL used |
| Pages errored during crawl | Not in `link-graph.json`; noted as "not crawled" in audit if reachable |
| Single-page site | Orphan = homepage only; no analysis output needed — handled gracefully |

---

## Files to Modify / Create

| File | Change |
|---|---|
| `scripts/crawl.js` | Add `body a[href]` eval; build and write `link-graph.json` |
| `scripts/link-audit.js` | New file — graph analysis and LINK_AUDIT.md generation |
| `run.js` | Add `link-audit` step |
| `config.js` | Add optional `weakPageThreshold: 2` and `overlinkedMultiplier: 2` |
| `CLAUDE.md` | Document `node run.js link-audit` command |

No new npm dependencies.
