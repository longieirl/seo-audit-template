#!/usr/bin/env node
// run.js — main entry point
// Usage:
//   node run.js [crawl|research|report|all] [url] [serpApiKey]
//   npm run audit -- https://mysite.com MY_API_KEY

const { crawl }            = require('./scripts/crawl');
const { research }         = require('./scripts/research');
const { generateReport }   = require('./scripts/report');
const { suggestKeywords }  = require('./scripts/suggest-keywords');

function validateAndNormaliseUrl(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('No URL provided. Usage: node run.js [step] <url> [serpApiKey]');
  }

  let normalised = raw.trim();
  if (!/^https?:\/\//i.test(normalised)) {
    normalised = 'https://' + normalised;
  }

  let parsed;
  try {
    parsed = new URL(normalised);
  } catch {
    throw new Error(`Invalid URL: "${raw}". Did you mean https://${raw}?`);
  }

  if (parsed.hostname === 'localhost' || /^127\.|^192\.168\.|^10\./.test(parsed.hostname)) {
    console.warn(`Warning: "${parsed.hostname}" looks like a local address — results may be incomplete.`);
  }

  return normalised;
}

function buildConfig(argv) {
  const [,, step = 'all', urlArg, keyArg] = argv;
  const base = require('./config');
  const overrides = {
    ...(urlArg && { siteUrl: validateAndNormaliseUrl(urlArg) }),
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
    const updated = await suggestKeywords(config);
    console.log('\nKeywords selected:', updated.keywords);
  }

  if (step === 'research' || step === 'all') {
    let researchConfig = config;
    if (config.keywords.every(k => /^your keyword/i.test(k.trim()))) {
      console.log('\n--- Extracting keyword suggestions from crawled content ---');
      researchConfig = await suggestKeywords(config);
    }
    console.log('\n--- Step 2: Keyword research ---');
    await research(researchConfig);
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
