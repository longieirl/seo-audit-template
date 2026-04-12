# Priority Impact Scoring — Design Spec

**Date:** 2026-04-12
**Scope:** Score and sort keyword gaps in GAP_REPORT.md by ranking impact potential
**Status:** Approved

---

## Problem

Every content gap in `GAP_REPORT.md` is displayed with identical visual weight. A keyword where the site ranks position 11 with 10,000 monthly impressions looks the same as a keyword nobody searches for where the site has never appeared. Without prioritisation, users must manually sort through all gaps to find the ones worth fixing — and most don't. This is a major flaw: the report's primary output (the gap list) produces the same result regardless of opportunity size.

---

## Solution Overview

Add a scoring function to `report.js` that assigns each gap a **priority tier** (HIGH / MEDIUM / LOW) based on three signals available in the existing SerpAPI data. Gaps are then grouped by tier in `GAP_REPORT.md`, with HIGH-priority gaps first.

No new npm dependencies. No new pipeline steps. No new API calls.

---

## Section 1: Scoring Formula

### Components

The score is computed from three factors, all available in `all_results.json` today:

#### 1. Position Score (primary signal, 0–60 points)

Based on verified CTR data (SISTRIX 80M keyword study, SmartInsights): CTR drops by >50% crossing from position 10 to position 11. Position tier mapping:

| Position | Points | Rationale |
|---|---|---|
| 1–7 | 20 | Already ranking well — consolidate, not priority fix |
| 8–15 | 60 | "Striking distance" — one optimisation from page 1 |
| 16–30 | 30 | Visible but competitive |
| 31–50 | 15 | Long-tail opportunity |
| 51+ | 5 | Low ROI |
| Not ranking | 10 | Unknown — could be gap or content not yet indexed |

"Striking distance" (positions 8–15) receives the highest score because moving from position 11 to position 8 can more than double traffic (CTR goes from ~0.9% to ~2.4%) for the same page with minimal new content work.

#### 2. PAA Bonus (traffic proxy, multiplier 1.0–1.4)

SerpAPI `people_also_ask` count proxies for search intent strength. More PAA questions correlate with higher query volume and commercial intent.

| PAA Count | Multiplier |
|---|---|
| 0 | 1.0 |
| 1–2 | 1.1 |
| 3–4 | 1.25 |
| 5+ | 1.4 |

#### 3. Business Value Weight (commercial intent proxy, multiplier 0.8–1.5)

URL and title patterns infer page type:

| Pattern | Multiplier | Examples |
|---|---|---|
| Commercial intent | 1.5 | `/services`, `/pricing`, `/packages`, `/hire`, `/book`, titles containing "cost", "price", "near me" |
| Informational | 1.0 | `/blog`, `/guide`, `/tips`, `/how-to` |
| Other | 0.8 | Navigation, utility, generic pages |

Classification is based on `keyword` string matching (not page URL, since gaps are for pages that don't yet exist). Keywords containing commercial modifiers ("near me", "cost", "price", "hire", "book") receive 1.5×.

### Final Score (internal, not shown in report)

```
rawScore = positionScore × paaMultiplier × businessMultiplier
```

This raw score is used **only** for sorting within tier. It is not displayed.

### Tier Classification

| Tier | Threshold | Label |
|---|---|---|
| HIGH | rawScore ≥ 45 | HIGH priority |
| MEDIUM | rawScore 20–44 | MEDIUM priority |
| LOW | rawScore < 20 | LOW priority |

---

## Section 2: Worked Example

**Input:** Keyword "accommodation dingle ireland", site ranks position 11, 4 PAA questions, keyword contains "ireland" (geo, neutral business weight 1.0)

```
positionScore    = 60   (position 8–15 striking distance)
paaMultiplier    = 1.25 (3–4 PAA questions)
businessWeight   = 1.0
rawScore         = 60 × 1.25 × 1.0 = 75
tier             = HIGH  (≥ 45)
```

**Input:** Keyword "what is seo", site not ranking, 1 PAA question, informational

```
positionScore    = 10   (not ranking)
paaMultiplier    = 1.1  (1–2 PAA)
businessWeight   = 0.8  (informational)
rawScore         = 10 × 1.1 × 0.8 = 8.8
tier             = LOW  (< 20)
```

---

## Section 3: Integration Point

Scoring lives **inside `report.js`** as a `scoreGap(gap)` function and a `classifyKeyword(keyword)` helper.

Rationale: no new I/O, no new pipeline step. The `gaps` array is already computed in `generateReport()`. Adding `scoreGap()` is a pure function applied to each gap object before the report is written. No changes to `run.js`, `CLAUDE.md`, or `README` required for the scorer itself.

```js
// New functions in report.js:
function positionScore(gap) { ... }
function paaMultiplier(gap) { ... }
function businessWeight(keyword) { ... }
function scoreGap(gap) {
  const raw = positionScore(gap) * paaMultiplier(gap) * businessWeight(gap.keyword);
  if (raw >= 45) return { tier: 'HIGH', raw };
  if (raw >= 20) return { tier: 'MEDIUM', raw };
  return { tier: 'LOW', raw };
}
```

Each gap object in the `uncovered` array gains a `{ tier, raw }` property.

---

## Section 4: Report Output

### Structure change to GAP_REPORT.md

Replace the current flat numbered list with three tiered sections:

```markdown
## Content Gaps — by Priority

### HIGH Priority Gaps (N)

*These keywords are in striking distance of page 1, or have strong commercial intent.*

#### 1. accommodation dingle ireland — HIGH PRIORITY
[existing gap content: competitor, PAA, related searches, top 5 results]

---

### MEDIUM Priority Gaps (N)

...

### LOW Priority Gaps (N)

...
```

Within each tier, gaps are sorted descending by `raw` score (highest opportunity first).

### Priority summary table (new, at top of gaps section)

```markdown
| Priority | Count | What to do |
|----------|-------|------------|
| HIGH     | 4     | Fix these first — highest traffic ROI |
| MEDIUM   | 8     | Address after HIGH items are handled |
| LOW      | 12    | Long-tail; tackle after MEDIUM or deprioritise |
```

### Limitations caveat block (mandatory)

Added immediately after the summary table:

```markdown
> **Score methodology note:** Priority tiers are estimated from ranking position
> and search intent signals available in SerpAPI results. They do not use actual
> search volume data. A HIGH rating means "close to page 1 and/or strong intent
> signal" — not "guaranteed high traffic." Validate HIGH-priority items in Google
> Search Console before committing significant content resources.
```

---

## Section 5: Config Additions

No new required fields. All defaults are built in. Optional config overrides:

```js
// config.js — all optional, built-in defaults shown
strikingDistanceMin: 8,   // positions 8–strikingDistanceMax treated as HIGH
strikingDistanceMax: 15,
```

Threshold tuning (`weakPageThreshold`, `overlinkedMultiplier`) are for the link graph feature, not this one.

---

## Files to Modify

| File | Change |
|---|---|
| `scripts/report.js` | Add `scoreGap()`, `positionScore()`, `paaMultiplier()`, `businessWeight()` functions; group gaps by tier in output |

No new files. No new dependencies.

---

## Open Questions (deferred to implementation)

**OQ-1 (deferred):** Should already-ranking pages (positions 1–7) appear as "CONSOLIDATE" items rather than being hidden in the existing "Already Ranking" section? Deferred — current section is sufficient for v1.

**OQ-2 (deferred):** Should true gaps on commercial pages (never ranked, high business weight) score higher than the current formula yields? The formula gives "services page, never ranked" a score of ~12 (LOW) today. A future enhancement could add a "commercial gap" bonus tier. Deferred.

**OQ-3 (deferred):** Should tier thresholds be configurable in `config.js`? Deferred — defaults are sufficient for v1.
