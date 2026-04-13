// scripts/report.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isAlreadyCovered, tokenise } = require('./report');

// ── tokenise ────────────────────────────────────────────────────────────────

describe('tokenise', () => {
  it('lowercases and splits on non-alphanumeric', () => {
    assert.deepEqual(tokenise('Guest-House Dingle'), ['guest', 'house', 'dingle']);
  });
  it('strips punctuation', () => {
    assert.deepEqual(tokenise("B&B's in Dingle"), ['b', 'b', 's', 'in', 'dingle']);
  });
  it('returns empty array for empty string', () => {
    assert.deepEqual(tokenise(''), []);
  });
});

// ── isAlreadyCovered ────────────────────────────────────────────────────────

const pages = [
  { title: 'Dingle Bed and Breakfast Guide', url: 'https://example.ie/dingle-bed-and-breakfast/', file: 'dingle_bnb.md' },
  { title: 'SEO Services Ireland',           url: 'https://example.ie/seo-services/',            file: 'seo.md'       },
  { title: 'Guesthouses Dingle',             url: 'https://example.ie/guesthouses-dingle/',       file: 'guesthouses.md' },
];

describe('isAlreadyCovered', () => {
  it('exact multi-word match in title → covered', () => {
    assert.equal(isAlreadyCovered('bed and breakfast dingle', pages), true);
  });

  it('short single-token keyword matches as standalone token', () => {
    assert.equal(isAlreadyCovered('seo', pages), true);
  });

  it('short keyword does NOT produce false positive against unrelated pages', () => {
    const icePages = [{ title: 'Nice Hotels', url: 'https://example.ie/nice-hotels/', file: 'nice.md' }];
    assert.equal(isAlreadyCovered('ice', icePages), false);
  });

  it('hyphenated URL variant — "guest house dingle" vs /guesthouses-dingle/ → NOT covered', () => {
    // "guest" and "house" don't appear as tokens in "guesthouses" — only "dingle" matches → 1/3 < 50%
    assert.equal(isAlreadyCovered('guest house dingle', pages), false);
  });

  it('50%+ token overlap → covered', () => {
    assert.equal(isAlreadyCovered('dingle guesthouses', pages), true);
  });

  it('empty keyword → not covered', () => {
    assert.equal(isAlreadyCovered('', pages), false);
  });

  it('keyword with no matching page → not covered', () => {
    assert.equal(isAlreadyCovered('self catering cork', pages), false);
  });

  it('partial match below threshold → not covered', () => {
    // "dingle yoga retreat" → only "dingle" matches → 1/3 < 50%
    assert.equal(isAlreadyCovered('dingle yoga retreat', pages), false);
  });
});
