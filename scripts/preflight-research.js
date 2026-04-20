// scripts/preflight-research.js
const { execSync } = require('child_process');

const PLACEHOLDER_KEY = 'YOUR_SERP_API_KEY';
const MCP_HEALTHCHECK = 'http://localhost:8000/healthcheck';

function checkMcpReachable() {
  try {
    const out = execSync(`curl -s --max-time 2 ${MCP_HEALTHCHECK}`, { encoding: 'utf8' });
    return out.includes('healthy');
  } catch {
    return false;
  }
}

async function preflightResearch(config) {
  const key = config.serpApiKey;
  if (key && key.trim() !== '' && key !== PLACEHOLDER_KEY) {
    return { proceed: true };
  }

  if (checkMcpReachable()) {
    console.warn(
      'No SerpAPI key provided. MCP server detected at localhost:8000 — ' +
      'skipping research step. Run /seo:audit to use MCP for keyword research.'
    );
    return { proceed: false, reason: 'mcp' };
  }

  console.warn('No SerpAPI key provided and no MCP server found — skipping research step.');
  return { proceed: false, reason: 'no-source' };
}

module.exports = { preflightResearch, checkMcpReachable };
