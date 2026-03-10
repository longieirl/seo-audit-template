// ─────────────────────────────────────────────
//  SEO Audit Config — edit this file per client
// ─────────────────────────────────────────────

module.exports = {
  // Target website
  siteUrl: 'https://your-client-site.com',

  // SerpAPI key — get one at serpapi.com
  // Tip: set SERP_API_KEY as an env variable instead of hardcoding it here
  serpApiKey: process.env.SERP_API_KEY || 'YOUR_SERP_API_KEY',

  // Google search locale
  searchCountry: 'ie',   // ISO country code: ie, gb, us, au, etc.
  searchLanguage: 'en',

  // Keywords to research — tailor these to the client's niche
  // Each keyword = 1 SerpAPI credit (free tier: 100/month)
  keywords: [
    'your keyword one',
    'your keyword two',
    'your keyword three',
  ],

  // Output directory (relative to project root)
  outputDir: './output',
};
