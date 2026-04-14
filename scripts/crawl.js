// scripts/crawl.js
// Crawls the target site and saves each page as a markdown file

const { chromium } = require('playwright-chromium');
const fs = require('fs');
const path = require('path');
const TurndownService = require('turndown');

function slugify(url) {
  return url
    .replace(/https?:\/\/[^/]+/, '')
    .replace(/\//g, '_')
    .replace(/[^a-z0-9_-]/gi, '') || 'index';
}

async function crawl(config) {
  const DEFAULT_STRIP = ['script', 'style', 'noscript', 'nav', 'footer', 'header', 'iframe'];
  const stripElements = (config.crawl && config.crawl.stripElements) || DEFAULT_STRIP;
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  td.remove(stripElements);

  const OUTPUT_DIR = path.resolve(config.outputDir, 'content');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const { hostname } = new URL(config.siteUrl);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const visited = new Set();
  const queue = [config.siteUrl];
  const results = [];
  const graph = {};

  while (queue.length > 0) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    console.log(`Crawling: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);

      const title     = await page.title();
      const metaDesc  = await page.$eval('meta[name="description"]', el => el.content).catch(() => '');
      const h1        = await page.$eval('h1', el => el.innerText).catch(() => '');
      const bodyHtml  = await page.$eval('body', el => el.innerHTML).catch(() => '');

      // Collect internal links for BFS queue (all DOM links including nav)
      const links = await page.$$eval('a[href]', as => as.map(a => a.href));
      for (const link of links) {
        try {
          const u = new URL(link);
          const clean = u.href.split('#')[0];
          if (u.hostname === hostname && !visited.has(clean) && !clean.includes('mailto:') && !clean.includes('tel:')) {
            queue.push(clean);
          }
        } catch {}
      }

      // Collect body-content links for link graph, excluding nav/header/footer/iframe
      const bodyLinks = await page.$$eval(
        'body a[href]',
        (as, stripped) => as.filter(a => !a.closest(stripped.join(','))).map(a => a.href),
        stripElements
      ).catch(() => []);
      const seen = new Set();
      for (const l of bodyLinks) {
        try {
          const u = new URL(l);
          const clean = u.href.split('#')[0];
          if (u.hostname === hostname && clean !== url) seen.add(clean);
        } catch {}
      }
      graph[url] = [...seen];

      const markdown = td.turndown(bodyHtml);
      const slug     = slugify(url) || 'index';
      const filepath = path.join(OUTPUT_DIR, `${slug}.md`);
      fs.writeFileSync(filepath, `# ${title}\n\n**URL:** ${url}\n**Meta Description:** ${metaDesc}\n**H1:** ${h1}\n\n---\n\n${markdown}`);

      results.push({ url, title, metaDesc, h1, file: `${slug}.md` });
      console.log(`  -> Saved: ${slug}.md`);
    } catch (err) {
      console.error(`  ERROR on ${url}: ${err.message}`);
    }
  }

  await browser.close();

  fs.writeFileSync(path.join(OUTPUT_DIR, 'link-graph.json'), JSON.stringify(graph, null, 2));

  const index = results.map(r => `- [${r.title}](${r.url}) → \`${r.file}\``).join('\n');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'INDEX.md'), `# Crawl Index — ${hostname}\n\n${index}\n`);

  console.log(`\nCrawl complete. ${results.length} pages saved to ${OUTPUT_DIR}`);
  return results;
}

module.exports = { crawl };

if (require.main === module) crawl(require('../config')).catch(console.error);
