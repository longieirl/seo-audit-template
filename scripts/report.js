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

function positionScore(gap) {
  const pos = gap.organic?.find(o => o.link && o.position)?.position || null;
  if (!pos) return 10;
  if (pos <= 7)  return 20;
  if (pos <= 15) return 60;
  if (pos <= 30) return 30;
  if (pos <= 50) return 15;
  return 5;
}

function paaMultiplier(gap) {
  const count = gap.people_also_ask?.length || 0;
  if (count >= 5) return 1.4;
  if (count >= 3) return 1.25;
  if (count >= 1) return 1.1;
  return 1.0;
}

function businessWeight(keyword) {
  const kw = keyword.toLowerCase();
  if (/near me|cost|price|pricing|hire|book|booking|services|packages/.test(kw)) return 1.5;
  if (/how to|what is|what are|why |guide|tips|blog/.test(kw)) return 0.8;
  return 1.0;
}

function scoreGap(gap) {
  const raw = positionScore(gap) * paaMultiplier(gap) * businessWeight(gap.keyword);
  if (raw >= 45) return { tier: 'HIGH', raw };
  if (raw >= 20) return { tier: 'MEDIUM', raw };
  return { tier: 'LOW', raw };
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

  const uncovered = gaps
    .filter(g => !g.covered)
    .map(g => ({ ...g, score: scoreGap(g) }))
    .sort((a, b) => {
      const tierOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return tierOrder[a.score.tier] - tierOrder[b.score.tier] || b.score.raw - a.score.raw;
    });
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

## Content Gaps — by Priority (${uncovered.length} total)

${(() => {
  const high   = uncovered.filter(g => g.score.tier === 'HIGH');
  const medium = uncovered.filter(g => g.score.tier === 'MEDIUM');
  const low    = uncovered.filter(g => g.score.tier === 'LOW');

  const priorityTable = `| Priority | Count | What to do |
|----------|-------|------------|
| HIGH     | ${high.length}     | Fix these first — highest traffic ROI |
| MEDIUM   | ${medium.length}     | Address after HIGH items are handled |
| LOW      | ${low.length}     | Long-tail; tackle after MEDIUM or deprioritise |

> **Score methodology note:** Priority tiers are estimated from ranking position
> and search intent signals available in SerpAPI results. They do not use actual
> search volume data. A HIGH rating means "close to page 1 and/or strong intent
> signal" — not "guaranteed high traffic." Validate HIGH-priority items in Google
> Search Console before committing significant content resources.`;

  const renderGap = (r, i) => `
#### ${i + 1}. ${r.keyword} — ${r.score.tier} PRIORITY

**Top competitor:** ${r.topCompetitor}
**People Also Ask:**
${r.people_also_ask?.length ? r.people_also_ask.map(q => `- ${q}`).join('\n') : '_None_'}
**Related searches:**
${r.related_searches?.slice(0, 5).length ? r.related_searches.slice(0, 5).map(s => `- ${s}`).join('\n') : '_None_'}
**Top 5 results:**
${r.organic?.map(o => `${o.position}. [${o.title}](${o.link})`).join('\n') || '_None_'}
`;

  const sections = [];
  if (high.length)   sections.push(`### HIGH Priority Gaps (${high.length})\n\n*These keywords are in striking distance of page 1, or have strong commercial intent.*\n${high.map(renderGap).join('\n---\n')}`);
  if (medium.length) sections.push(`### MEDIUM Priority Gaps (${medium.length})\n${medium.map(renderGap).join('\n---\n')}`);
  if (low.length)    sections.push(`### LOW Priority Gaps (${low.length})\n${low.map(renderGap).join('\n---\n')}`);

  return priorityTable + '\n\n' + sections.join('\n\n---\n\n');
})()}

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

module.exports = { generateReport, isAlreadyCovered, tokenise, scoreGap };

if (require.main === module) generateReport(require('../config'));
