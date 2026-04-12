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
