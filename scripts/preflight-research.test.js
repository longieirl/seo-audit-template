'use strict';

const assert = require('assert');
const childProcess = require('child_process');

async function withMockExecFileSync(mockFn, fn) {
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
    assert.strictEqual(result.proceed, false);
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
    assert.strictEqual(result.proceed, false);
    console.log('PASS: undefined key treated as missing');
  }

  // Test 6: checkMcpReachable never throws even on execFileSync error
  {
    await withMockExecFileSync(() => { throw new Error('ECONNREFUSED'); }, async () => {
      const { checkMcpReachable } = loadFresh();
      let threw = false;
      try {
        checkMcpReachable();
      } catch {
        threw = true;
      }
      assert.strictEqual(threw, false, 'checkMcpReachable must not throw');
    });
    console.log('PASS: checkMcpReachable never throws');
  }

  console.log('\nAll preflight-research tests passed.');
}

runTests().catch(err => { console.error('TEST FAILED:', err.message); process.exit(1); });
