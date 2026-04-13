// scripts/report.js
// Reads crawled content + SerpAPI data and generates a markdown gap report

const fs = require('fs');
const path = require('path');

function loadExistingContent(contentDir) {
  const indexPath = path.join(contentDir, 'INDEX.md');
  if (!fs.existsSync(indexPath)) return [];
  return fs.readFileSync(indexPath, 'utf8')
    .split('\n')
    .filter(l => l.startsWith('- ['))
    .map(l => {
      const title = l.match(/\[(.+?)\]/)?.[1] || '';
      const url   = l.match(/\((.+?)\)/)?.[1] || '';
      const file  = l.match(/`(.+?)`/)?.[1] || '';
      return { title, url, file };
    });
}

function loadSerpResults(serpDir) {
  const allPath = path.join(serpDir, 'all_results.json');
  if (!fs.existsSync(allPath)) return {};
  return JSON.parse(fs.readFileSync(allPath, 'utf8'));
}

function tokenise(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

const MATCH_THRESHOLD = 0.5;

function isAlreadyCovered(keyword, existingPages) {
  const kwTokens = tokenise(keyword);
  if (kwTokens.length === 0) return false;

  return existingPages.some(p => {
    const pageTokens = new Set([
      ...tokenise(p.title),
      ...tokenise(p.url),
    ]);
    const matches = kwTokens.filter(t => pageTokens.has(t)).length;
    return matches / kwTokens.length >= MATCH_THRESHOLD;
  });
}

function generateReport(config) {
  const CONTENT_DIR = path.resolve(config.outputDir, 'content');
  const SERP_DIR    = path.resolve(config.outputDir, 'serp');
  const hostname    = new URL(config.siteUrl).hostname;

  const existing = loadExistingContent(CONTENT_DIR);
  const serp     = loadSerpResults(SERP_DIR);
  const date     = new Date().toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' });

  // Collect all PAA questions
  const allPAA = [...new Set(
    Object.values(serp).flatMap(r => r.people_also_ask || [])
  )];

  // Collect all related searches
  const allRelated = [...new Set(
    Object.values(serp).flatMap(r => r.related_searches || [])
  )];

  // Identify gaps — keywords not covered by any existing page
  const gaps = Object.values(serp)
    .filter(r => !r.error)
    .map(r => ({
      ...r,
      covered: isAlreadyCovered(r.keyword, existing),
      topCompetitor: r.organic?.[0]?.link || 'n/a',
      rankingSelf: r.organic?.some(o => o.link.includes(hostname)),
    }));

  const uncovered = gaps.filter(g => !g.covered);
  const alreadyRanking = gaps.filter(g => g.rankingSelf);

  let md = `# SEO Content Gap Report — ${hostname}
**Generated:** ${date}
**Site:** ${config.siteUrl}

---

## Existing Pages (${existing.length} total)

${existing.map(p => `- [${p.title}](${p.url})`).join('\n')}

---

## Keywords Already Ranking For

${alreadyRanking.length === 0 ? '_None detected._' : alreadyRanking.map(r =>
  `- **${r.keyword}** — top result: ${r.organic?.[0]?.title} (${r.organic?.[0]?.link})`
).join('\n')}

---

## Content Gaps — Uncovered Keywords (${uncovered.length})

${uncovered.map((r, i) => `
### ${i + 1}. ${r.keyword}

**Top competitor:** ${r.topCompetitor}
**People Also Ask:**
${r.people_also_ask?.length ? r.people_also_ask.map(q => `- ${q}`).join('\n') : '_None_'}
**Related searches:**
${r.related_searches?.slice(0, 5).length ? r.related_searches.slice(0, 5).map(s => `- ${s}`).join('\n') : '_None_'}
**Top 5 results:**
${r.organic?.map(o => `${o.position}. [${o.title}](${o.link})`).join('\n') || '_None_'}
`).join('\n---\n')}

---

## People Also Ask — All Questions (${allPAA.length})

${allPAA.map(q => `- ${q}`).join('\n')}

---

## Related Searches Across All Keywords

${allRelated.map(s => `- ${s}`).join('\n')}

---

_Raw data: \`${config.outputDir}/content\` and \`${config.outputDir}/serp\`_
`;

  const reportPath = path.resolve(config.outputDir, 'GAP_REPORT.md');
  fs.writeFileSync(reportPath, md);
  console.log(`\nReport saved to ${reportPath}`);
}

module.exports = { generateReport, isAlreadyCovered, tokenise };

if (require.main === module) generateReport(require('../config'));
