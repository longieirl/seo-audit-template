# Design: Config Centralisation and Keyword Pipeline Legibility

**Date:** 2026-04-12
**Issues:** #9 (config centralisation), #10 (suggest-keywords encapsulation)
**Scope:** `run.js`, `scripts/crawl.js`, `scripts/research.js`, `scripts/report.js`, `scripts/suggest-keywords.js`
**PR strategy:** Single combined PR — changes are cohesive and touch the same files

---

## Problem Summary

### Issue #9 — Config assembled and mutated as ambient state

Config is built inline at the top of `run.js` (lines 12–26) as an ad-hoc spread, then mutated mid-run at line 49 (`config = await suggestKeywords(config)`). Each script (`crawl.js`, `research.js`, `report.js`) declares `= require('../config')` as a default parameter, making them appear independent but secretly coupling them to a global file. A script called without an explicit config silently uses stale defaults.

### Issue #10 — Internal pipeline order in `suggest-keywords.js` is implicit

`module.exports` already correctly exposes only `suggestKeywords` — the sub-functions are private. The issue is legibility: the pipeline sequence (extract → normalise → geo-enrich → select) must be inferred by reading all five functions. A single comment makes it immediately obvious.

---

## Design

### 1. Extract `buildConfig(argv)` in `run.js`

Add a pure function at the top of `run.js` that owns all config assembly:

```js
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
```

`main()` opens with `const { step, config } = buildConfig(process.argv)`. `config` is a `const` — never reassigned. The `suggestKeywords` mutation becomes a local: `const updatedConfig = await suggestKeywords(config)`, used only for the research step.

### 2. Remove default `require('../config')` params from scripts

Remove the `= require('../config')` default parameter from:
- `crawl.js:18` — `async function crawl(config = require('../config'))`
- `research.js:21` — `async function research(config = require('../config'))`
- `report.js:35` — `function generateReport(config = require('../config'))`

Each becomes a required argument. The `if (require.main === module)` guards at the bottom of each script (for standalone invocation) pass `require('../config')` explicitly:

```js
// e.g. at the bottom of crawl.js
if (require.main === module) crawl(require('../config')).catch(console.error);
```

This makes the config contract explicit: scripts trust that what they receive is already valid and fully assembled.

### 3. Add pipeline comment to `suggestKeywords()` in `suggest-keywords.js`

Add one comment line inside `suggestKeywords()` before the pipeline steps:

```js
// Pipeline: extract headings → normalise → add geo variants → user selects
```

No other changes to this file. Behaviour is identical.

---

## Files Changed

| File | Change |
|------|--------|
| `run.js` | Add `buildConfig(argv)`, replace inline config assembly, use `const` for config, remove `config =` reassignment |
| `scripts/crawl.js` | Remove default param, add explicit `require('../config')` to `if (require.main === module)` guard |
| `scripts/research.js` | Same as crawl.js |
| `scripts/report.js` | Same as crawl.js |
| `scripts/suggest-keywords.js` | Add one pipeline comment inside `suggestKeywords()` |

---

## Constraints

- No new npm dependencies
- No behaviour change — all existing CLI invocations produce identical output
- `config.js` keywords remain as placeholders (reset before commit per CLAUDE.md)
- All commits require DCO sign-off (`git commit -s`)

---

## Out of Scope

- URL validation (#12) — separate issue, higher priority, separate PR
- Rate limiter extraction (#11) — separate issue
- TurndownService injection (#13) — separate issue
- Gap detection fix (#14) — separate issue
