# Config Centralisation and Keyword Pipeline Legibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralise config assembly into a single `buildConfig(argv)` function in `run.js`, remove hidden `require('../config')` default params from scripts, and add a pipeline comment to `suggest-keywords.js` to make the internal sequence legible.

**Architecture:** `buildConfig(argv)` in `run.js` owns all config merging and `outputDir` derivation. Scripts receive config as an explicit required argument. The `if (require.main === module)` guard at the bottom of each script handles standalone invocation by passing `require('../config')` explicitly.

**Tech Stack:** Node.js 18+ built-ins only. No new dependencies.

---

## File Map

| File | What changes |
|------|-------------|
| `run.js` | Add `buildConfig(argv)` function; replace inline config assembly; make `config` a `const`; replace `config = await suggestKeywords(config)` with `const updatedConfig` |
| `scripts/crawl.js` | Remove `= require('../config')` default param; update `if (require.main === module)` guard |
| `scripts/research.js` | Remove `= require('../config')` default param; update `if (require.main === module)` guard |
| `scripts/report.js` | Remove `= require('../config')` default param; update `if (require.main === module)` guard |
| `scripts/suggest-keywords.js` | Add one pipeline comment inside `suggestKeywords()` |

---

## Task 1: Add `buildConfig(argv)` to `run.js` and wire it into `main()`

**Files:**
- Modify: `run.js`

- [ ] **Step 1: Replace the top of `run.js`**

Open `run.js`. Replace everything from line 1 through line 66 with the following complete file contents:

```js
#!/usr/bin/env node
// run.js — main entry point
// Usage:
//   node run.js [crawl|research|report|all] [url] [serpApiKey]
//   npm run audit -- https://mysite.com MY_API_KEY

const { crawl }          = require('./scripts/crawl');
const { research }       = require('./scripts/research');
const { generateReport } = require('./scripts/report');

function buildConfig(argv) {
  const [,, step = 'all', urlArg, keyArg] = argv;
  const base = require('./config');
  const overrides = {
    ...(urlArg && { siteUrl: urlArg }),
    ...(keyArg && { serpApiKey: keyArg }),
  };
  const merged = { ...base, ...overrides };

  if (urlArg && merged.outputDir === base.outputDir) {
    const hostname = new URL(merged.siteUrl).hostname.replace(/^www\./, '');
    merged.outputDir = `./${hostname.replace(/\./g, '-')}-seo`;
  }

  return { step, config: merged };
}

const { step, config } = buildConfig(process.argv);

async function main() {
  console.log(`\n=== SEO Audit Tool ===`);
  console.log(`Site:   ${config.siteUrl}`);
  console.log(`Output: ${config.outputDir}\n`);

  if (step === 'crawl' || step === 'all') {
    console.log('--- Step 1: Crawling site ---');
    await crawl(config);
  }

  if (step === 'suggest') {
    const { suggestKeywords } = require('./scripts/suggest-keywords');
    const updated = await suggestKeywords(config);
    console.log('\nKeywords selected:', updated.keywords);
  }

  if (step === 'research' || step === 'all') {
    const hasPlaceholders = config.keywords.every(k => /^your keyword/i.test(k.trim()));
    if (hasPlaceholders) {
      const { suggestKeywords } = require('./scripts/suggest-keywords');
      console.log('\n--- Extracting keyword suggestions from crawled content ---');
      const updatedConfig = await suggestKeywords(config);
      console.log('\n--- Step 2: Keyword research ---');
      await research(updatedConfig);
    } else {
      console.log('\n--- Step 2: Keyword research ---');
      await research(config);
    }
  }

  if (step === 'report' || step === 'all') {
    console.log('\n--- Step 3: Generating gap report ---');
    generateReport(config);
  }

  console.log('\nAll done. Check the output folder.');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke-test — no URL arg (uses config.js defaults)**

```bash
node run.js 2>&1 | head -5
```

Expected output (site and output from `config.js` defaults):
```
=== SEO Audit Tool ===
Site:   https://your-client-site.com
Output: ./output
```

- [ ] **Step 3: Smoke-test — with URL arg**

```bash
node run.js crawl https://example.com 2>&1 | head -5
```

Expected output (outputDir derived from hostname):
```
=== SEO Audit Tool ===
Site:   https://example.com
Output: ./example-com-seo
```

The crawl will fail (no real network needed for this check) — we only care that the header lines show the correct derived values before it errors.

- [ ] **Step 4: Commit**

```bash
git add run.js
git commit -s -m "refactor: centralise config assembly into buildConfig(argv)"
```

---

## Task 2: Remove default `require('../config')` param from `crawl.js`

**Files:**
- Modify: `scripts/crawl.js`

- [ ] **Step 1: Update the function signature and standalone guard**

In `scripts/crawl.js`, make two changes:

Change line 18 from:
```js
async function crawl(config = require('../config')) {
```
To:
```js
async function crawl(config) {
```

Change the last line (line 79) from:
```js
if (require.main === module) crawl().catch(console.error);
```
To:
```js
if (require.main === module) crawl(require('../config')).catch(console.error);
```

- [ ] **Step 2: Verify the module still loads cleanly**

```bash
node -e "require('./scripts/crawl')"
```

Expected: no output, no error (module loads without executing anything).

- [ ] **Step 3: Commit**

```bash
git add scripts/crawl.js
git commit -s -m "refactor: remove implicit config default from crawl.js"
```

---

## Task 3: Remove default `require('../config')` param from `research.js`

**Files:**
- Modify: `scripts/research.js`

- [ ] **Step 1: Update the function signature and standalone guard**

In `scripts/research.js`, make two changes:

Change line 21 from:
```js
async function research(config = require('../config')) {
```
To:
```js
async function research(config) {
```

Change the last line (line 64) from:
```js
if (require.main === module) research().catch(console.error);
```
To:
```js
if (require.main === module) research(require('../config')).catch(console.error);
```

- [ ] **Step 2: Verify the module still loads cleanly**

```bash
node -e "require('./scripts/research')"
```

Expected: no output, no error.

- [ ] **Step 3: Commit**

```bash
git add scripts/research.js
git commit -s -m "refactor: remove implicit config default from research.js"
```

---

## Task 4: Remove default `require('../config')` param from `report.js`

**Files:**
- Modify: `scripts/report.js`

- [ ] **Step 1: Update the function signature and standalone guard**

In `scripts/report.js`, make two changes:

Change line 35 from:
```js
function generateReport(config = require('../config')) {
```
To:
```js
function generateReport(config) {
```

Change the last line (line 125) from:
```js
if (require.main === module) generateReport();
```
To:
```js
if (require.main === module) generateReport(require('../config'));
```

- [ ] **Step 2: Verify the module still loads cleanly**

```bash
node -e "require('./scripts/report')"
```

Expected: no output, no error.

- [ ] **Step 3: Commit**

```bash
git add scripts/report.js
git commit -s -m "refactor: remove implicit config default from report.js"
```

---

## Task 5: Add pipeline comment to `suggest-keywords.js`

**Files:**
- Modify: `scripts/suggest-keywords.js`

- [ ] **Step 1: Add the comment**

In `scripts/suggest-keywords.js`, find the three consecutive lines inside `suggestKeywords()` (around lines 164–166):

```js
  const rawCandidates = extractCandidates(contentDir);
  const normalised    = normalise(rawCandidates);
  const candidates    = addGeoVariants(normalised, config.searchCountry || '');
```

Add a comment on the line immediately above them:

```js
  // Pipeline: extract headings → normalise → add geo variants → user selects
  const rawCandidates = extractCandidates(contentDir);
  const normalised    = normalise(rawCandidates);
  const candidates    = addGeoVariants(normalised, config.searchCountry || '');
```

- [ ] **Step 2: Verify the module still loads cleanly**

```bash
node -e "require('./scripts/suggest-keywords')"
```

Expected: no output, no error.

- [ ] **Step 3: Commit**

```bash
git add scripts/suggest-keywords.js
git commit -s -m "docs: add pipeline comment to suggestKeywords for legibility"
```

---

## Task 6: End-to-end smoke test and PR

**Files:** none modified

- [ ] **Step 1: Verify full `run.js` invocation with `all` step and a URL**

```bash
node run.js all https://example.com 2>&1 | head -10
```

Expected: header lines show `https://example.com` and `./example-com-seo`, then crawl begins (or fails on network — that's fine, we're testing config wiring only).

- [ ] **Step 2: Verify `node run.js` with no args still uses config.js defaults**

```bash
node run.js 2>&1 | head -4
```

Expected:
```
=== SEO Audit Tool ===
Site:   https://your-client-site.com
Output: ./output
```

- [ ] **Step 3: Push branch and create PR**

```bash
git push -u origin feat/issues-9-10-config-and-keyword-legibility
gh pr create \
  --title "refactor: centralise config and clarify keyword pipeline (#9, #10)" \
  --body "$(cat <<'EOF'
## Summary

- Extracts `buildConfig(argv)` in `run.js` — config assembly and `outputDir` derivation now live in one pure function; `config` is a `const`, never reassigned
- Removes `= require('../config')` default params from `crawl.js`, `research.js`, and `report.js` — scripts now require an explicit config argument, removing the hidden coupling to the global file
- Adds a single pipeline comment inside `suggestKeywords()` making the extract→normalise→geo-enrich→select sequence immediately legible

Closes #9, closes #10

## Test Plan

- [ ] `node run.js` (no args) prints correct site/output from `config.js` defaults
- [ ] `node run.js crawl https://example.com` prints `Output: ./example-com-seo`
- [ ] `node -e "require('./scripts/crawl')"` loads without error
- [ ] `node -e "require('./scripts/research')"` loads without error
- [ ] `node -e "require('./scripts/report')"` loads without error
EOF
)"
```
