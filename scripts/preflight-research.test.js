'use strict';

const assert = require('assert');
const childProcess = require('child_process');

async function withMockExecFileSync(mockFn, fn) {
  // IMPORTANT: loadFresh() must be called INSIDE the mock callback (after execFileSync is patched)
  // because preflight-research.js uses a destructured const binding that captures the reference
  // at module load time. The mock must be in place before require() runs.
  const original = childProcess.execFileSync;
  childProcess.execFileSync = mockFn;
  try {
    return await fn();
  } finally {
    childProcess.execFileSync = original;
  }
}

function loadFresh() {
  delete require.cache[require.resolve('./preflight-research')];
  return require('./preflight-research');
}

async function runTests() {
  // Test 1: valid key → proceed:true, no curl called
  {
    let curlCalled = false;
    await withMockExecFileSync(() => { curlCalled = true; return ''; }, async () => {
      const { preflightResearch } = loadFresh();
      const result = await preflightResearch({ serpApiKey: 'real-key-abc123' });
      assert.deepStrictEqual(result, { proceed: true });
      assert.strictEqual(curlCalled, false, 'curl should not be called when key is valid');
    });
    console.log('PASS: valid key returns proceed:true without calling curl');
  }

  // Test 2: placeholder key → not treated as valid
  {
    const result = await withMockExecFileSync(() => { throw new Error('connection refused'); }, async () => {
      const { preflightResearch } = loadFresh();
      return preflightResearch({ serpApiKey: 'YOUR_SERP_API_KEY' });
    });
    assert.deepStrictEqual(result, { proceed: false, reason: 'no-source' });
    console.log('PASS: placeholder key not treated as valid');
  }

  // Test 3: no key, MCP healthy → reason:mcp
  {
    const result = await withMockExecFileSync(() => '{"status":"healthy"}', async () => {
      const { preflightResearch } = loadFresh();
      return preflightResearch({ serpApiKey: '' });
    });
    assert.deepStrictEqual(result, { proceed: false, reason: 'mcp' });
    console.log('PASS: no key + MCP healthy → reason:mcp');
  }

  // Test 4: no key, MCP not reachable → reason:no-source
  {
    const result = await withMockExecFileSync(() => { throw new Error('ECONNREFUSED'); }, async () => {
      const { preflightResearch } = loadFresh();
      return preflightResearch({ serpApiKey: '' });
    });
    assert.deepStrictEqual(result, { proceed: false, reason: 'no-source' });
    console.log('PASS: no key + MCP down → reason:no-source');
  }

  // Test 5: undefined key → treated as missing
  {
    const result = await withMockExecFileSync(() => { throw new Error('ECONNREFUSED'); }, async () => {
      const { preflightResearch } = loadFresh();
      return preflightResearch({ serpApiKey: undefined });
    });
    assert.deepStrictEqual(result, { proceed: false, reason: 'no-source' });
    console.log('PASS: undefined key treated as missing');
  }

  // Test 6: whitespace-only key → treated as missing
  {
    const result = await withMockExecFileSync(() => { throw new Error('ECONNREFUSED'); }, async () => {
      const { preflightResearch } = loadFresh(); // must be inside mock callback
      return preflightResearch({ serpApiKey: '   ' });
    });
    assert.deepStrictEqual(result, { proceed: false, reason: 'no-source' });
    console.log('PASS: whitespace-only key treated as missing');
  }

  // Test 7: checkMcpReachable returns true when curl output contains 'healthy'
  {
    await withMockExecFileSync(() => '{"status":"healthy"}', async () => {
      const { checkMcpReachable } = loadFresh(); // must be inside mock callback
      const result = checkMcpReachable();
      assert.strictEqual(result, true, 'checkMcpReachable should return true for healthy response');
    });
    console.log('PASS: checkMcpReachable returns true for healthy response');
  }

  // Test 8: checkMcpReachable never throws even on execFileSync error
  {
    await withMockExecFileSync(() => { throw new Error('ECONNREFUSED'); }, async () => {
      const { checkMcpReachable } = loadFresh(); // must be inside mock callback
      let threw = false;
      let result;
      try {
        result = checkMcpReachable();
      } catch {
        threw = true;
      }
      assert.strictEqual(threw, false, 'checkMcpReachable must not throw');
      assert.strictEqual(result, false, 'checkMcpReachable must return false on error');
    });
    console.log('PASS: checkMcpReachable never throws');
  }

  console.log('\nAll preflight-research tests passed.');
}

runTests().catch(err => { console.error('TEST FAILED:', err.message); process.exit(1); });
