---
name: seo:audit
description: Run a full SEO content strategy audit for a client website using the seo-audit-template pipeline
allowed-tools:
  - Read
  - Edit
  - Bash
  - Glob
  - Grep
---

## Multi-Domain Mode

When `$ARGUMENTS` contains two or more URLs, this command runs in **multi-domain mode**. Single-URL invocations skip this section entirely and follow the single-domain instructions below unchanged.

### Argument parsing

Split `$ARGUMENTS` on whitespace. Classify each token:

- URL token — contains a `.` and no spaces, optionally prefixed with `http://` or `https://`. Normalise bare domains by prepending `https://` (e.g. `staydingleway.ie` → `https://staydingleway.ie`).
- API key token — the last token that is NOT a URL. Use as the SerpAPI key. Falls back to `SERP_API_KEY` env var.

Mode selection:
- 1 URL → skip this section, proceed to single-domain instructions below
- 2+ URLs → continue with multi-domain steps below

> **Sub-agent key requirement:** Sub-agents call the MCP server directly via HTTP — they do not use the parent session's MCP tool. The key must be resolved during preflight and passed explicitly in every sub-agent prompt so they can include it in the `Authorization: Bearer` header. If no key is resolvable from arguments or `SERP_API_KEY`, the preflight check (Step 0) will catch this before any agents are spawned.

### Step A: Check for existing audits

For each URL in the list, derive the output directory name:
1. Strip `www.` from the hostname
2. Replace all `.` with `-`
3. Append `-seo`

Example: `https://www.staydingleway.ie` → `staydingleway-ie-seo`

Check whether `./<dirname>/SEO_CONTENT_STRATEGY.md` exists for each domain:

```bash
ls ./<dirname>/SEO_CONTENT_STRATEGY.md 2>/dev/null && echo "exists" || echo "missing"
```

Build two lists:
- new_domains — no existing strategy file found → always included in the run
- existing_domains — strategy file found, note the last-modified date from `ls -l`

If existing_domains is empty, proceed directly to Step B.

If existing_domains is non-empty, use `AskUserQuestion` to ask the user — one question per existing domain — with options `["Re-run", "Skip"]`:

> Completed audit already exists for `<dirname>/` (last modified: <date>). Re-run or skip?

Add "Re-run" answers to domains_to_run. Exclude "Skip" answers.
Add all new_domains to domains_to_run automatically.

If domains_to_run is empty after this:
> All domains already have completed audits. Nothing to do.

Stop — do not proceed to Step B.

### Step B: Spawn parallel sub-agents

Spawn one sub-agent per domain in domains_to_run using the `Agent` tool. Launch ALL agents in a single message with multiple parallel tool calls — do not wait for one to finish before starting the next.

Each sub-agent prompt must be fully self-contained. Use this template for each:

> **Important when building the prompt:** Replace `<SERP_KEY>` with the actual resolved key string from preflight. Replace `<RESEARCH_MODE>` with `mcp` or `direct`. Never tell the sub-agent to "check the env var" or "check config.js" — those will not be set in sub-agent context.

---
You are running a full SEO audit for: <URL>

Research mode: <RESEARCH_MODE> (mcp | direct)
SerpAPI key: <SERP_KEY>

Follow these instructions exactly:

1. Derive output folder: strip www., replace dots with hyphens, append -seo (e.g. staydingleway-ie-seo).
2. Crawl the site: `node run.js crawl <URL>`. Read crawled content in ./<dirname>/content/. If only the homepage was captured, use WebFetch to supplement.
3. Choose 15–20 keywords tailored to this site's niche from what you learned in the crawl.
4. Run keyword research using the method below that matches your research mode:

   **If research mode is `mcp`:**
   For each keyword, make an HTTP POST to the MCP server using this exact curl pattern:
   ```bash
   curl -s -X POST "http://localhost:8000/mcp" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <SERP_KEY>" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{"params":{"engine":"google","q":"KEYWORD_HERE","gl":"ie","hl":"en","num":"10"},"mode":"compact"}}}'
   ```
   Do NOT use GET. Do NOT use `/search`, `/sse`, or `/{key}/mcp` path formats. Do NOT omit the Authorization header.
   Parse the response and save to ./<dirname>/serp/<slug>.json with fields: keyword, organic (array of {position, title, link, snippet}), people_also_ask (array of strings), related_searches (array of strings).

   **If research mode is `direct`:**
   Run: `node run.js research <URL> <SERP_KEY>`

5. Combine all per-keyword files into ./<dirname>/serp/all_results.json (array of keyword objects).
6. Generate gap report: `node run.js report <URL>`
7. Write strategy doc at ./<dirname>/SEO_CONTENT_STRATEGY.md with sections: What Was Done, Key Findings, Prioritised Page Recommendations, Quick Wins, Build Order.
8. Export PDF: `python3 generate_pdf.py ./<dirname>`. If Playwright Chromium not installed, run `playwright install chromium` first.
9. Do NOT write to or reset config.js — this is a parallel run and config.js is shared.

When done, report: DONE: <URL>
If any curl returns a non-200 or an error field in the JSON, report: FAILED: <URL> — <reason>
---

### Step C: Report summary

After all sub-agents complete, print:

```
SEO Audit Complete — <N> domains processed

✓ <hostname>
  Strategy: ./<dirname>/SEO_CONTENT_STRATEGY.md
  PDF:      ./<dirname>/<dirname-without-seo>-seo-strategy.pdf
```

For any domain whose sub-agent returned an error:

```
✗ <hostname> — FAILED
  Re-run manually: /seo:audit <URL>
```

### Single-domain mode

If only one URL is provided, skip the multi-domain steps above. The single-domain flow begins here:

Run a full SEO content strategy audit for the given URL using the pipeline in the current project directory.

**Usage:** `/seo:audit <url> [serp-api-key]`

Arguments from the command line: `$ARGUMENTS`

Parse `$ARGUMENTS` as follows:
- First argument: the client site URL (required)
  Normalise bare domains by prepending https:// (e.g. staydingleway.ie → https://staydingleway.ie).
- Second argument: the SerpAPI key (optional — falls back to `SERP_API_KEY` env var, then MCP server)

If no URL is provided, ask the user for it before proceeding.

**Key resolution order (single-domain):**

1. Second argument passed to the command
2. `SERP_API_KEY` environment variable
3. MCP server at `localhost:8000` (auto-detected)

If neither argument nor env var is present, run the MCP healthcheck before stopping:

```bash
curl -s --max-time 2 http://localhost:8000/healthcheck 2>/dev/null || echo "not reachable"
```

- Response contains `"healthy"` → validate by calling the MCP `search` tool directly:
  ```json
  { "params": { "engine": "google", "q": "test", "num": "1" }, "mode": "compact" }
  ```
  - Returns results → set `$RESEARCH_MODE=mcp`, leave `$SERP_KEY` empty, proceed to Step 1
  - Returns auth/quota error → STOP with preflight failure message (see Step 0)
- Not reachable → STOP with preflight failure message (see Step 0)

---

## Instructions

Work from the project root (current working directory). Do not rewrite any scripts — use the tools already in place.

### 0. Preflight check — verify SerpAPI key before any work begins

**Run this before crawling, before spawning sub-agents, before anything else.**

Resolve the research mode in this order of preference:

**Option A — MCP server (preferred)**

Check if the MCP server is reachable:

```bash
curl -s http://localhost:8000/healthcheck 2>/dev/null || echo "not reachable"
```

If it returns `{"status":"healthy"...}`, the server is up. The key is embedded in the Claude Code session's MCP connection — **do not attempt to read it from env vars or config.js, and do not test it via curl**. Instead, validate by calling the MCP `search` tool directly from this session with a 1-result test query:

```json
{ "params": { "engine": "google", "q": "test", "num": "1" }, "mode": "compact" }
```

- Returns results → ✅ set `$RESEARCH_MODE=mcp`, proceed
- Returns auth/quota error → ❌ STOP — session key is invalid or quota exhausted

**Option B — Direct API key (fallback, only if MCP not reachable)**

Check for a key:
```bash
echo "SERP_API_KEY=${SERP_API_KEY:-not set}"
node -e "const c = require('./config.js'); console.log('config key:', c.serpApiKey)"
```

If a non-placeholder key is found, validate it:
```bash
curl -s "https://serpapi.com/search.json?engine=google&q=test&num=1&api_key=${SERP_API_KEY}" \
  | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.exit(d.error?1:0)" \
  && echo "KEY_VALID" || echo "KEY_INVALID"
```

- `KEY_VALID` → ✅ set `$RESEARCH_MODE=direct`, proceed
- `KEY_INVALID` → ❌ STOP

**If neither option is available, stop immediately:**

> **Preflight failed — SerpAPI not available.**
>
> _No MCP server and no API key found:_
> - Start the MCP server, or
> - Pass a key as an argument: `/seo:audit https://site.com YOUR_KEY`, or
> - Set the env var: `export SERP_API_KEY=your_key_here`
>
> _MCP server up but search failed:_
> - Check your SerpAPI account credits at https://serpapi.com/manage-api-key
>
> No audit credits have been used. Re-run once resolved.

Do not proceed to crawling or any other step until preflight passes.

**Store `$RESEARCH_MODE`** (`mcp` or `direct`) for use in all subsequent steps and sub-agent prompts.

> **Sub-agent key scoping:** The MCP session key is not accessible to sub-agents via env or config. Sub-agents must call the MCP server directly via HTTP with the `Authorization: Bearer` header. The key must be extracted from the MCP server URL or passed explicitly — see sub-agent template in Step B above.

### 1. Determine research mode

There are two ways to run keyword research. Prefer MCP if the server is available.

**Option A — SerpAPI MCP server (preferred)**

Check if the MCP server is running:

```bash
curl -s http://localhost:8000/healthcheck 2>/dev/null || echo "not reachable"
```

Use `/healthcheck` — not `/health` or `/` (those return 401 without a key and are unreliable for reachability checks). A 200 response means the server is up.

If reachable, use the MCP `search` tool directly for all keyword research in step 5 instead of running `node run.js research`. Make requests via:

```bash
curl -s -X POST "http://localhost:8000/mcp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SERP_KEY>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{"params":{"engine":"google","q":"KEYWORD","gl":"ie","hl":"en","num":"10"},"mode":"compact"}}}'
```

If it is not reachable, tell the user they can optionally start it:
```bash
git clone https://github.com/serpapi/serpapi-mcp.git
cd serpapi-mcp
uv sync && uv run src/server.py
```
Then fall back to Option B.

**Option B — Direct API key (fallback)**

Check for a key in this order:

1. Second argument passed to the command (e.g. `/seo:audit https://site.com MY_KEY`)
2. `SERP_API_KEY` environment variable
3. `serpApiKey` field already set in `config.js`

If none are present, tell the user:

> No SerpAPI key found. Either start the MCP server or provide a key:
> ```bash
> export SERP_API_KEY=your_key_here
> ```
> Then re-run `/seo:audit`.

Do not proceed without either the MCP server or an API key.

### 2. Derive client folder name

From the URL, derive a short, lowercase, hyphenated folder name with a `-seo` suffix (e.g. `https://example.ie` → `example-seo`).

Output is written to `./<client>-seo/` inside the project directory. These folders are gitignored.

### 3. Crawl the site

Run crawl only first so you can read the content before choosing keywords:

```bash
node run.js crawl <url>
```

Read the crawled content in `./<client>-seo/content/` to understand the business, existing topics, and content gaps.

If the crawler only captures the homepage (common on heavily JS-rendered sites like Wix or Squarespace), supplement by fetching the live site with the WebFetch tool to extract the full property/product/service inventory before choosing keywords.

### 4. Choose keywords

Based on what you learned from the crawl, update `config.js` with 15–20 relevant keywords tailored to the client's niche. Each keyword costs 1 SerpAPI credit.

### 5. Run keyword research and gap report

**If using MCP (Option A):** Call the MCP `search` tool directly for each keyword — do not run `node run.js research`. For each keyword, call the tool with:

```json
{
  "params": {
    "engine": "google",
    "q": "<keyword>",
    "gl": "<searchCountry>",
    "hl": "<searchLanguage>",
    "num": "10"
  },
  "mode": "compact"
}
```

Save the results manually to `./<client>-seo/serp/<keyword>.json` in the same format `research.js` produces (fields: `keyword`, `organic`, `people_also_ask`, `related_searches`), then write `all_results.json` combining all keywords. This allows `report.js` to run unchanged.

**If using direct API key (Option B):**

```bash
node run.js research <url> <serp-api-key>
```

If no API key was provided as an argument, omit it — the pipeline falls back to the `SERP_API_KEY` env var.

**Then run the gap report (both options):**

```bash
node run.js report <url>
```

### 6. Write the content strategy

Read the gap report at `./<client>-seo/GAP_REPORT.md`, then write `./<client>-seo/SEO_CONTENT_STRATEGY.md` containing:

```
## What Was Done
## Key Findings
## Prioritised Page Recommendations (keyword, why it can rank, competitor gap)
## Quick Wins (no new pages needed)
## Build Order
```

### 7. Export to PDF

Pass the client output directory explicitly — `npm run pdf` defaults to `./output` and will fail for URL-derived output dirs:

```bash
python3 generate_pdf.py ./<client>-seo
```

If Playwright's Python Chromium is not installed, run this first:

```bash
playwright install chromium
```

### 8. Reset config.js keywords

Reset only the `keywords` array in `./config.js` back to placeholders:
```js
keywords: ['your keyword one', 'your keyword two', 'your keyword three'],
```

### 9. Confirm completion

Tell the user the audit is complete and where to find the outputs:
- Strategy doc: `./<client>-seo/SEO_CONTENT_STRATEGY.md`
- PDF: `./<client>-seo/<client>-seo-strategy.pdf`
- Gap report: `./<client>-seo/GAP_REPORT.md`
