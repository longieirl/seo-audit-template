---
name: MCP fallback when no SerpAPI key is passed
description: Design for detecting and validating a running MCP server when no SerpAPI key is provided, in both run.js and audit.md
type: project
---

# MCP Fallback — No Key Passed

## Problem

When no SerpAPI key is passed as an argument (or set via env var), the pipeline currently fails during the research step with an unhelpful error. If an MCP server is running at `localhost:8000`, the user has a valid research path available — but neither `run.js` nor the `/seo:audit` single-domain flow detects or uses it.

## Goal

- `run.js`: when no key is present, check for a running MCP server. If found, skip the research step with a clear message directing the user to `/seo:audit`. If not found, skip research with a "no source" warning. The rest of the pipeline continues.
- `audit.md` (single-domain): when no key is passed, try MCP first (healthcheck + validation). If valid, proceed with `$RESEARCH_MODE=mcp`. If MCP is also unavailable, stop with the existing preflight failure message.

## Architecture

No new files. Two targeted changes:

1. `run.js` — new `preflightResearch(config)` async function
2. `.claude/commands/seo/audit.md` — tightened single-domain argument parsing block

## Component Design

### `run.js` — `preflightResearch(config)`

```
preflightResearch(config) → { proceed: boolean, reason?: 'mcp' | 'no-source' }
```

Logic:
1. If `config.serpApiKey` is set, non-empty, and not equal to `'YOUR_SERP_API_KEY'` → return `{ proceed: true }`
2. `curl -s --max-time 2 http://localhost:8000/healthcheck`
   - Response contains `"healthy"` → log MCP-detected message, return `{ proceed: false, reason: 'mcp' }`
   - Not reachable → log no-source message, return `{ proceed: false, reason: 'no-source' }`

Console output:
- MCP detected: `"No SerpAPI key provided. MCP server detected at localhost:8000 — skipping research step. Run /seo:audit to use MCP for keyword research."`
- No source: `"No SerpAPI key provided and no MCP server found — skipping research step."`

The research block in `main()` becomes:
```js
if (step === 'research' || step === 'all') {
  const preflight = await preflightResearch(config);
  if (preflight.proceed) {
    // existing research logic
  }
}
```

All other steps (crawl, link-audit, report) are unaffected.

### `audit.md` — single-domain argument parsing

After parsing `$ARGUMENTS`, when no key is resolved from argument or `SERP_API_KEY`:

1. Run `curl -s --max-time 2 http://localhost:8000/healthcheck`
2. If healthy → call MCP `search` tool with `{ params: { engine: "google", q: "test", num: "1" }, mode: "compact" }`
   - Returns results → set `$RESEARCH_MODE=mcp`, set `$SERP_KEY=""`, proceed
   - Returns auth/quota error → STOP with preflight failure message
3. If not reachable → STOP with preflight failure message

This makes single-domain preflight equivalent to the existing multi-domain Step 0.

## Data Flow

```
run.js invoked without key
  └── preflightResearch()
        ├── key present? → proceed normally
        ├── MCP healthy? → skip research, warn user
        └── neither?     → skip research, warn user

/seo:audit invoked without key
  └── single-domain arg parsing
        ├── key in args or SERP_API_KEY? → proceed with $RESEARCH_MODE=direct
        ├── MCP healthy + valid?         → proceed with $RESEARCH_MODE=mcp
        └── neither?                     → STOP, preflight failure message
```

## Error Handling

- `curl` timeout set to 2 seconds to avoid stalling the pipeline
- `preflightResearch` never throws — it catches curl failures and treats them as "not reachable"
- The `audit.md` MCP validation failure path reuses the existing preflight failure message verbatim

## Out of Scope

- `run.js` does not make curl calls to the MCP server for actual research (that path is AI-session-only)
- No changes to multi-domain flow (already handles this correctly in Step 0)
- No new npm dependencies
