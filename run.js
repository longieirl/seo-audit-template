#!/usr/bin/env node
// run.js — main entry point
// Usage: node run.js [crawl|research|report|all]

const { crawl }          = require('./scripts/crawl');
const { research }       = require('./scripts/research');
const { generateReport } = require('./scripts/report');

const step = process.argv[2] || 'all';

async function main() {
  console.log(`\n=== SEO Audit Tool ===\n`);

  if (step === 'crawl' || step === 'all') {
    console.log('--- Step 1: Crawling site ---');
    await crawl();
  }

  if (step === 'research' || step === 'all') {
    console.log('\n--- Step 2: Keyword research ---');
    await research();
  }

  if (step === 'report' || step === 'all') {
    console.log('\n--- Step 3: Generating gap report ---');
    generateReport();
  }

  console.log('\nAll done. Check the output/ folder.');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
