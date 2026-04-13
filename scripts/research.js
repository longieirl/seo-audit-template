// scripts/research.js
// Queries SerpAPI for each keyword and saves results as JSON

const fs = require('fs');
const path = require('path');

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const RATE_LIMIT_MS  = 1100;
const MAX_RETRIES    = 2;

async function withRateLimit(fn, delayMs = RATE_LIMIT_MS, retries = MAX_RETRIES) {
  let attempt = 0;
  while (true) {
    try {
      const result = await fn();
      await new Promise(r => setTimeout(r, delayMs));
      return result;
    } catch (err) {
      const status = err.status;
      if (attempt < retries && status && RETRY_STATUSES.has(status)) {
        const backoff = delayMs * Math.pow(2, attempt);
        console.warn(`  Retrying (attempt ${attempt + 1}/${retries}) after ${backoff}ms — ${err.message}`);
        await new Promise(r => setTimeout(r, backoff));
        attempt++;
      } else {
        throw err;
      }
    }
  }
}

async function serpSearch(keyword, config) {
  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('api_key', config.serpApiKey);
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', keyword);
  url.searchParams.set('gl', config.searchCountry);
  url.searchParams.set('hl', config.searchLanguage);
  url.searchParams.set('num', '10');

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = new Error(`SerpAPI ${res.status}: ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function research(config) {
  const OUTPUT_DIR = path.resolve(config.outputDir, 'serp');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const allResults = {};

  for (const keyword of config.keywords) {
    console.log(`Searching: "${keyword}"`);
    try {
      const data = await withRateLimit(() => serpSearch(keyword, config));

      const result = {
        keyword,
        organic: (data.organic_results || []).slice(0, 5).map(r => ({
          position: r.position,
          title: r.title,
          link: r.link,
          snippet: r.snippet,
        })),
        people_also_ask: (data.related_questions || []).map(q => q.question),
        related_searches: (data.related_searches || []).map(r => r.query),
      };

      allResults[keyword] = result;
      const slug = keyword.replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '');
      fs.writeFileSync(path.join(OUTPUT_DIR, `${slug}.json`), JSON.stringify(result, null, 2));
      console.log(`  -> ${result.organic.length} results, ${result.people_also_ask.length} PAA questions`);
    } catch (err) {
      console.error(`  ERROR for "${keyword}": ${err.message}`);
      allResults[keyword] = { keyword, error: err.message };
    }
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'all_results.json'), JSON.stringify(allResults, null, 2));
  console.log(`\nResearch complete. Results saved to ${OUTPUT_DIR}`);
  return allResults;
}

module.exports = { research };

if (require.main === module) research(require('../config')).catch(console.error);
