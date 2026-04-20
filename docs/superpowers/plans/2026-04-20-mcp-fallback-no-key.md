# MCP Fallback — No Key Passed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When no SerpAPI key is provided, detect a running MCP server and either skip research gracefully (CLI) or proceed via MCP (AI command).

**Architecture:** Two surgical changes — a `preflightResearch()` async function added to `run.js` that gates the research step, and a tightened single-domain argument parsing block in `audit.md` that tries MCP before stopping. No new files, no new dependencies.

**Tech Stack:** Node.js 18+ built-ins (`child_process.execSync`), existing `curl` CLI, Markdown (audit.md command)

---

## File Map

| File | Change |
|------|--------|
| `run.js` | Add `preflightResearch(config)` function; wrap research block with its result |
| `.claude/commands/seo/audit.md` | Add MCP fallback branch in single-domain arg parsing section |
| `scripts/research.test.js` | Add unit tests for `preflightResearch` (extracted to testable module) |

> **Note on testing:** `preflightResearch` uses `curl` via `child_process`. Tests mock `execSync` to avoid network calls. There are no existing automated tests for `run.js` — this plan adds the first.

---

### Task 1: Extract `preflightResearch` into `scripts/preflight-research.js` (testable unit)

The function needs to be importable by tests. Rather than burying it inside `run.js`, put it in a small focused module and require it from `run.js`.

**Files:**
- Create: `scripts/preflight-research.js`
- Modify: `run.js` (require the new module)

- [ ] **Step 1: Create `scripts/preflight-research.js`**

```js
// scripts/preflight-research.js
const { execSync } = require('child_process');

const PLACEHOLDER_KEY = 'YOUR_SERP_API_KEY';
const MCP_HEALTHCHECK = 'http://localhost:8000/healthcheck';

function checkMcpReachable() {
  try {
    const out = execSync(`curl -s --max-time 2 ${MCP_HEALTHCHECK}`, { encoding: 'utf8' });
    return out.includes('healthy');
  } catch {
    return false;
  }
}

async function preflightResearch(config) {
  const key = config.serpApiKey;
  if (key && key.trim() !== '' && key !== PLACEHOLDER_KEY) {
    return { proceed: true };
  }

  if (checkMcpReachable()) {
    console.warn(
      'No SerpAPI key provided. MCP server detected at localhost:8000 — ' +
      'skipping research step. Run /seo:audit to use MCP for keyword research.'
    );
    return { proceed: false, reason: 'mcp' };
  }

  console.warn('No SerpAPI key provided and no MCP server found — skipping research step.');
  return { proceed: false, reason: 'no-source' };
}

module.exports = { preflightResearch, checkMcpReachable };
```

- [ ] **Step 2: Verify the file parses cleanly**

```bash
node -e "require('./scripts/preflight-research')"
```

Expected: no output, exit code 0.

- [ ] **Step 3: Commit the new module (no wiring yet)**

```bash
git add scripts/preflight-research.js
git commit -s -m "feat: add preflightResearch module for MCP/key detection"
```

---

### Task 2: Wire `preflightResearch` into `run.js`

**Files:**
- Modify: `run.js`

- [ ] **Step 1: Add the require at the top of `run.js`**

In `run.js`, after the existing `require` block (after line 11), add:

```js
const { preflightResearch } = require('./scripts/preflight-research');
```

- [ ] **Step 2: Wrap the research block**

In `run.js`, find the research block (currently around line 76):

```js
  if (step === 'research' || step === 'all') {
    let researchConfig = config;
    if (config.keywords.every(k => /^your keyword/i.test(k.trim()))) {
      console.log('\n--- Extracting keyword suggestions from crawled content ---');
      researchConfig = await suggestKeywords(config);
    }
    console.log('\n--- Step 2: Keyword research ---');
    await research(researchConfig);
  }
```

Replace with:

```js
  if (step === 'research' || step === 'all') {
    const pf = await preflightResearch(config);
    if (pf.proceed) {
      let researchConfig = config;
      if (config.keywords.every(k => /^your keyword/i.test(k.trim()))) {
        console.log('\n--- Extracting keyword suggestions from crawled content ---');
        researchConfig = await suggestKeywords(config);
      }
      console.log('\n--- Step 2: Keyword research ---');
      await research(researchConfig);
    }
  }
```

- [ ] **Step 3: Verify `run.js` parses cleanly**

```bash
node -e "require('./run.js')" 2>&1 | head -5
```

Expected: prints `=== SEO Audit Tool ===` lines and a URL error (no URL arg passed) — that's fine. No syntax errors.

- [ ] **Step 4: Smoke test — no key, no MCP**

With no `SERP_API_KEY` set and MCP server not running:

```bash
SERP_API_KEY= node run.js research https://example.com
```

Expected output contains:
```
No SerpAPI key provided and no MCP server found — skipping research step.
```

- [ ] **Step 5: Commit**

```bash
git add run.js
git commit -s -m "feat: skip research step gracefully when no key and no MCP server"
```

---

### Task 3: Write tests for `preflightResearch`

The project has no test runner config yet. `scripts/research.test.js` exists — check its structure and follow the same pattern.

**Files:**
- Create: `scripts/preflight-research.test.js`

- [ ] **Step 1: Check existing test structure**

```bash
head -30 scripts/research.test.js
```

Note the test framework used (likely Node's built-in `assert` or a lightweight runner).

- [ ] **Step 2: Write the test file**

```js
// scripts/preflight-research.test.js
const assert = require('assert');
const { execSync } = require('child_process');

// Manually mock execSync by monkey-patching the module's require cache
// so preflightResearch uses our controlled version
const childProcess = require('child_process');

async function withMockExecSync(returnValue, throwError, fn) {
  const original = childProcess.execSync;
  if (throwError) {
    childProcess.execSync = () => { throw new Error('connection refused'); };
  } else {
    childProcess.execSync = () => returnValue;
  }
  try {
    return await fn();
  } finally {
    childProcess.execSync = original;
  }
}

// Re-require after patching so the module picks up our mock
function loadFresh() {
  delete require.cache[require.resolve('./preflight-research')];
  return require('./preflight-research');
}

async function runTests() {
  // Test 1: valid key → proceed immediately, no curl
  {
    const { preflightResearch } = loadFresh();
    const result = await preflightResearch({ serpApiKey: 'real-key-abc123' });
    assert.deepStrictEqual(result, { proceed: true });
    console.log('PASS: valid key returns proceed:true');
  }

  // Test 2: placeholder key → not treated as valid
  {
    const result = await withMockExecSync('', true, async () => {
      const { preflightResearch } = loadFresh();
      return preflightResearch({ serpApiKey: 'YOUR_SERP_API_KEY' });
    });
    assert.strictEqual(result.proceed, false);
    console.log('PASS: placeholder key not treated as valid');
  }

  // Test 3: no key, MCP healthy → proceed:false, reason:mcp
  {
    const result = await withMockExecSync('{"status":"healthy"}', false, async () => {
      const { preflightResearch } = loadFresh();
      return preflightResearch({ serpApiKey: '' });
    });
    assert.deepStrictEqual(result, { proceed: false, reason: 'mcp' });
    console.log('PASS: no key + MCP healthy → reason:mcp');
  }

  // Test 4: no key, MCP not reachable → proceed:false, reason:no-source
  {
    const result = await withMockExecSync('', true, async () => {
      const { preflightResearch } = loadFresh();
      return preflightResearch({ serpApiKey: '' });
    });
    assert.deepStrictEqual(result, { proceed: false, reason: 'no-source' });
    console.log('PASS: no key + MCP down → reason:no-source');
  }

  // Test 5: undefined key → treated as missing
  {
    const result = await withMockExecSync('', true, async () => {
      const { preflightResearch } = loadFresh();
      return preflightResearch({ serpApiKey: undefined });
    });
    assert.strictEqual(result.proceed, false);
    console.log('PASS: undefined key treated as missing');
  }

  console.log('\nAll preflight-research tests passed.');
}

runTests().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 3: Run the tests**

```bash
node scripts/preflight-research.test.js
```

Expected:
```
PASS: valid key returns proceed:true
PASS: placeholder key not treated as valid
PASS: no key + MCP healthy → reason:mcp
PASS: no key + MCP down → reason:no-source
PASS: undefined key treated as missing

All preflight-research tests passed.
```

- [ ] **Step 4: Commit**

```bash
git add scripts/preflight-research.test.js
git commit -s -m "test: add unit tests for preflightResearch"
```

---

### Task 4: Tighten `audit.md` single-domain preflight

The single-domain section currently stops with a "no key" error if `SERP_API_KEY` is not set. Add a MCP fallback branch before that stop.

**Files:**
- Modify: `.claude/commands/seo/audit.md`

- [ ] **Step 1: Read the current single-domain argument parsing section**

Open `.claude/commands/seo/audit.md` and locate the block starting at:

```
Parse `$ARGUMENTS` as follows:
```

and ending before `## Instructions`.

- [ ] **Step 2: Update the single-domain key resolution logic**

Find this paragraph in the single-domain section (around line 138–142):

```markdown
- Second argument: the SerpAPI key (optional — falls back to `SERP_API_KEY` env var)

If no URL is provided, ask the user for it before proceeding.
```

Replace with:

```markdown
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
```

- [ ] **Step 3: Verify the file is valid Markdown**

```bash
node -e "require('fs').readFileSync('.claude/commands/seo/audit.md', 'utf8'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/seo/audit.md
git commit -s -m "feat: try MCP server before stopping when no SerpAPI key in single-domain mode"
```

---

## Self-Review Checklist

- [x] **Spec: `run.js` preflightResearch** → Task 1 creates the module, Task 2 wires it
- [x] **Spec: skip research, continue pipeline** → Task 2 Step 2 wraps only the research block
- [x] **Spec: MCP detected message** → exact string in `preflight-research.js`
- [x] **Spec: no-source message** → exact string in `preflight-research.js`
- [x] **Spec: curl --max-time 2** → in both `preflight-research.js` and `audit.md`
- [x] **Spec: preflightResearch never throws** → try/catch in `checkMcpReachable`
- [x] **Spec: audit.md single-domain MCP fallback** → Task 4
- [x] **Spec: audit.md uses existing preflight failure message** → Task 4 references "see Step 0"
- [x] **No placeholders** → all steps have complete code
- [x] **Type consistency** → `preflightResearch` signature consistent across Tasks 1, 2, 3
