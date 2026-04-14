// scripts/link-audit.js
// Reads link-graph.json from the crawl step and generates LINK_AUDIT.md

const fs = require('fs');
const path = require('path');

function loadGraph(graphPath) {
  if (!fs.existsSync(graphPath)) {
    console.error('ERROR: link-graph.json not found. Run the crawl step first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(graphPath, 'utf8'));
}

function loadPageTitles(indexPath) {
  if (!fs.existsSync(indexPath)) return {};
  const titles = {};
  fs.readFileSync(indexPath, 'utf8')
    .split('\n')
    .filter(l => l.startsWith('- ['))
    .forEach(l => {
      const title = l.match(/\[(.+?)\]/)?.[1] || '';
      const url   = l.match(/\((.+?)\)/)?.[1] || '';
      if (url) titles[url] = title;
    });
  return titles;
}

function buildInboundMap(graph) {
  const inbound = {};        // url → count
  const inboundSources = {}; // url → [fromUrl, ...]
  const outbound = {};       // url → count

  for (const [from, toList] of Object.entries(graph)) {
    outbound[from] = toList.length;
    for (const to of toList) {
      inbound[to] = (inbound[to] || 0) + 1;
      inboundSources[to] = inboundSources[to] || [];
      inboundSources[to].push(from);
    }
  }

  return { inbound, inboundSources, outbound };
}

function linkAudit(config) {
  const CONTENT_DIR  = path.resolve(config.outputDir, 'content');
  const graphPath    = path.join(CONTENT_DIR, 'link-graph.json');
  const indexPath    = path.join(CONTENT_DIR, 'INDEX.md');
  const hostname     = new URL(config.siteUrl).hostname;
  const homepageUrl  = config.siteUrl.replace(/\/$/, '') + '/';
  const weakThreshold       = config.weakPageThreshold ?? 2;
  const overlinkedMultiplier = config.overlinkedMultiplier ?? 2;

  const graph  = loadGraph(graphPath);
  const titles = loadPageTitles(indexPath);
  const date   = new Date().toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' });

  const { inbound, inboundSources, outbound } = buildInboundMap(graph);

  const allPages = Object.keys(graph);
  const contentPages = allPages.filter(p => (p.replace(/\/$/, '') + '/') !== homepageUrl);

  // Average inbound across content pages (excluding homepage)
  const totalInbound = contentPages.reduce((s, p) => s + (inbound[p] || 0), 0);
  const avgInbound   = contentPages.length > 0 ? totalInbound / contentPages.length : 0;

  const orphans    = contentPages.filter(p => (inbound[p] || 0) === 0);
  const weak       = contentPages.filter(p => {
    const count = inbound[p] || 0;
    return count > 0 && count <= weakThreshold;
  });
  const overlinked = contentPages.filter(p => {
    const count = inbound[p] || 0;
    return count > weakThreshold && count > avgInbound * overlinkedMultiplier;
  });

  // Homepage inbound count (check both trailing-slash and non-trailing-slash forms)
  const homepageInbound = Math.max(
    inbound[homepageUrl] || 0,
    inbound[config.siteUrl.replace(/\/$/, '')] || 0,
  );

  function classifyPage(p) {
    const count = inbound[p] || 0;
    if (count === 0) return 'ORPHAN';
    if (count <= weakThreshold) return 'WEAK';
    if (count > avgInbound * overlinkedMultiplier) return 'OVERLINKED';
    return 'OK';
  }

  function pageLabel(url) {
    const title = titles[url];
    return title ? `[${title}](${url})` : url;
  }

  let md = `# Internal Link Audit — ${hostname}
**Generated:** ${date}
**Site:** ${config.siteUrl}

---

## Summary

| Metric | Value |
|--------|-------|
| Total pages crawled | ${allPages.length} |
| Average body inbound links (excl. homepage) | ${avgInbound.toFixed(1)} |
| Orphan pages (0 inbound body links) | ${orphans.length} |
| Weak pages (1–${weakThreshold} inbound body links) | ${weak.length} |
| Overlinked pages (>${overlinkedMultiplier}× average) | ${overlinked.length} |

---

## Orphan Pages (${orphans.length})

*Pages with zero inbound body links. They are crawlable via navigation but receive no editorial link equity.*

${orphans.length === 0
  ? '_None detected._'
  : orphans.map(p => `- ${pageLabel(p)}\n  - 0 inbound body links — add a link from a related content page`).join('\n')}

---

## Weak Pages (${weak.length})

*Pages with 1–${weakThreshold} inbound body links. Consider adding more editorial links to support these pages.*

${weak.length === 0
  ? '_None detected._'
  : weak.map(p => {
      const count = inbound[p] || 0;
      const sources = (inboundSources[p] || []).map(s => `    - linked from: ${s}`).join('\n');
      return `- ${pageLabel(p)}\n  - ${count} inbound body link${count === 1 ? '' : 's'}\n${sources}`;
    }).join('\n')}

---

## Overlinked Pages (${overlinked.length})

*Pages receiving more than ${overlinkedMultiplier}× the average inbound body links (avg: ${avgInbound.toFixed(1)}). Link equity may be concentrated here.*

${overlinked.length === 0
  ? '_None detected._'
  : overlinked.map(p => {
      const count = inbound[p] || 0;
      const multiple = avgInbound > 0 ? (count / avgInbound).toFixed(1) : 'N/A';
      return `- ${pageLabel(p)}\n  - ${count} inbound body links (${multiple}× average)`;
    }).join('\n')}

---

## Homepage

- ${pageLabel(config.siteUrl)}
  - ${homepageInbound} inbound body links
  - *Excluded from orphan/weak/overlinked analysis — the homepage is the natural link target for every page.*

---

## Full Page Table

| Page | Inbound | Outbound | Status |
|------|---------|----------|--------|
${allPages.map(p => {
  const isHome = p === config.siteUrl || p === homepageUrl || p === config.siteUrl.replace(/\/$/, '');
  const title = titles[p] || p;
  const displayTitle = title.length > 50 ? title.slice(0, 47) + '…' : title;
  const status = isHome ? 'HOME' : classifyPage(p);
  return `| [${displayTitle}](${p}) | ${inbound[p] || 0} | ${outbound[p] || 0} | ${status} |`;
}).join('\n')}

---

## Recommendations

${orphans.length > 0 ? `**Orphan pages — add internal links:**
${orphans.map((p, i) => `${i + 1}. ${pageLabel(p)} — find a related page that discusses a similar topic and link to this page from its body content.`).join('\n')}
` : ''}${weak.length > 0 ? `**Weak pages — strengthen internal linking:**
${weak.map((p, i) => {
  const count = inbound[p] || 0;
  return `${i + 1}. ${pageLabel(p)} — currently has ${count} body link${count === 1 ? '' : 's'}. Add links from additional related pages.`;
}).join('\n')}
` : ''}${orphans.length === 0 && weak.length === 0 ? '_No immediate linking actions required._\n' : ''}
---

## Limitations

*Body-content links only. Nav, header, and footer links are excluded from this analysis. A page may be well-linked via site navigation but still appear as an orphan here — check your navigation structure separately if you see unexpected orphans.*

_Raw data: \`${config.outputDir}/content/link-graph.json\`_
`;

  const reportPath = path.resolve(config.outputDir, 'LINK_AUDIT.md');
  fs.writeFileSync(reportPath, md);
  console.log(`\nLink audit saved to ${reportPath}`);
}

module.exports = { linkAudit };

if (require.main === module) linkAudit(require('../config'));
