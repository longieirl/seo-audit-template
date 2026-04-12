// suggest-keywords.js — extract keyword candidates from crawled content
// Pure Node.js, no external dependencies.

const fs   = require('fs');
const path = require('path');

const STOPWORDS = [
  'services', 'contact', 'about', 'home', 'menu', 'subscribe',
  'call', 'email', 'follow', 'gallery', 'projects', 'get a quote',
  'learn more', 'skip to content', 'scroll to top',
];

const COUNTRY_MODIFIERS = {
  ie: 'ireland',
  gb: 'uk',
  au: 'australia',
  ca: 'canada',
  nz: 'new zealand',
  za: 'south africa',
};

const IMAGE_NOISE = /jpeg|png|jpg|svg|\d+[×x]\d+/i;

function extractCandidates(contentDir) {
  const files = fs.readdirSync(contentDir).filter(
    f => f.endsWith('.md') && f !== 'INDEX.md'
  );

  const raw = [];

  for (const file of files) {
    const text = fs.readFileSync(path.join(contentDir, file), 'utf8');
    const lines = text.split('\n');

    // Tier 2 — Page title (first non-empty line, strip site suffix)
    const titleLine = lines.find(l => l.trim());
    if (titleLine) {
      const title = titleLine.replace(/^#+\s*/, '').replace(/\s[–|]\s.+$/, '').trim();
      raw.push(title);
    }

    // Tier 1 — H2 headings
    for (const line of lines) {
      const m = line.match(/^## (.+)$/);
      if (m) raw.push(m[1]);
    }

    // Tier 2 — H3 headings
    for (const line of lines) {
      const m = line.match(/^### (.+)$/);
      if (m) raw.push(m[1]);
    }
  }

  return raw;
}

function normalise(raw) {
  const seen = new Set();
  const out  = [];

  for (const str of raw) {
    let s = str
      .toLowerCase()
      .trim()
      .replace(/\//g, ' ')
      .replace(/[\[\]()_`*]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (IMAGE_NOISE.test(s)) continue;
    if (s.length < 3 || s.length > 60) continue;
    if (STOPWORDS.some(sw => s === sw || s.startsWith(sw + ' ') || s.endsWith(' ' + sw))) continue;

    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  return out.sort((a, b) => a.localeCompare(b));
}

function addGeoVariants(candidates, countryCode) {
  const modifier = COUNTRY_MODIFIERS[countryCode];
  if (!modifier) return candidates;

  const result = [];
  const seen   = new Set(candidates);

  for (const c of candidates) {
    result.push(c);
    if (!c.includes(modifier)) {
      const variant = `${c} ${modifier}`;
      if (!seen.has(variant)) {
        seen.add(variant);
        result.push(variant);
      }
    }
  }

  return result.sort((a, b) => a.localeCompare(b));
}

async function promptUser(candidates) {
  const { createInterface } = require('readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n--- Suggested keywords (from crawled content) ---');
  console.log('Note: each keyword costs 1 SerpAPI credit.\n');
  candidates.forEach((k, i) => console.log(`  ${i + 1}. ${k}`));

  const selectionInput = await rl.question(
    '\nEnter numbers to keep (e.g. 1,3,5-8) or press Enter to keep all: '
  );
  const extraInput = await rl.question(
    'Add any extra keywords (comma-separated, or Enter to skip): '
  );
  rl.close();

  let selected;
  if (!selectionInput.trim()) {
    selected = [...candidates];
  } else {
    const indices = new Set();
    for (const part of selectionInput.split(',')) {
      const range = part.trim().match(/^(\d+)-(\d+)$/);
      if (range) {
        for (let n = parseInt(range[1]); n <= parseInt(range[2]); n++) indices.add(n);
      } else {
        const n = parseInt(part.trim());
        if (!isNaN(n)) indices.add(n);
      }
    }
    selected = [...indices]
      .filter(n => n >= 1 && n <= candidates.length)
      .map(n => candidates[n - 1]);
  }

  if (extraInput.trim()) {
    const extras = extraInput.split(',').map(s => s.trim()).filter(Boolean);
    selected.push(...extras);
  }

  return selected;
}

function autoSelect(candidates) {
  const chosen = candidates.slice(0, 20);
  console.log('\n--- Auto-selected keywords (--auto / non-TTY) ---');
  chosen.forEach((k, i) => console.log(`  ${i + 1}. ${k}`));
  return chosen;
}

async function suggestKeywords(config) {
  const contentDir = path.join(config.outputDir, 'content');

  if (!fs.existsSync(contentDir)) {
    console.error('\nERROR: Content directory not found:', contentDir);
    console.error('Run the crawl step first.');
    process.exit(1);
  }

  // Pipeline: extract headings → normalise → add geo variants → user selects
  const rawCandidates = extractCandidates(contentDir);
  const normalised    = normalise(rawCandidates);
  const candidates    = addGeoVariants(normalised, config.searchCountry || '');

  if (candidates.length === 0) {
    console.error('\nERROR: No keyword candidates could be extracted.');
    console.error('Check that your content files contain H2 headings (## Heading).');
    process.exit(1);
  }

  const isAuto = process.argv.includes('--auto') || !process.stdin.isTTY;
  const selected = isAuto ? autoSelect(candidates) : await promptUser(candidates);

  return { ...config, keywords: selected };
}

module.exports = { suggestKeywords };
