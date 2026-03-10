#!/usr/bin/env node
// run.js — main entry point
// Usage:
//   node run.js [crawl|research|report|all] [url] [serpApiKey]
//   npm run audit -- https://mysite.com MY_API_KEY

const { crawl }          = require('./scripts/crawl');
const { research }       = require('./scripts/research');
const { generateReport } = require('./scripts/report');
const baseConfig         = require('./config');

const [,, step = 'all', urlArg, keyArg] = process.argv;

// CLI args override config.js values
const config = {
  ...baseConfig,
  ...(urlArg && { siteUrl: urlArg }),
  ...(keyArg && { serpApiKey: keyArg }),
};

// Derive outputDir from URL if not explicitly set and a URL was passed
if (urlArg && config.outputDir === baseConfig.outputDir) {
  const hostname = new URL(config.siteUrl).hostname.replace(/^www\./, '');
  const slug = hostname.replace(/\./g, '-');
  config.outputDir = `./${slug}-seo`;
}

async function main() {
  console.log(`\n=== SEO Audit Tool ===`);
  console.log(`Site:   ${config.siteUrl}`);
  console.log(`Output: ${config.outputDir}\n`);

  if (step === 'crawl' || step === 'all') {
    console.log('--- Step 1: Crawling site ---');
    await crawl(config);
  }

  if (step === 'research' || step === 'all') {
    console.log('\n--- Step 2: Keyword research ---');
    await research(config);
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
