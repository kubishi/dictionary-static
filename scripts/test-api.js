#!/usr/bin/env node

/**
 * Test script for the Cloudflare Functions API
 *
 * Usage:
 *   node scripts/test-api.js [base-url]
 *
 * Examples:
 *   node scripts/test-api.js                          # Uses http://localhost:8788
 *   node scripts/test-api.js https://dictionary.kubishi.com
 */

const BASE_URL = process.argv[2] || 'http://localhost:8788';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function testEndpoint(name, path, validate) {
  const url = `${BASE_URL}${path}`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      log(colors.red, `✗ ${name}`);
      console.log(`  Status: ${response.status}`);
      console.log(`  Error: ${data.error || 'Unknown error'}`);
      return false;
    }

    const validationResult = validate(data);
    if (validationResult === true) {
      log(colors.green, `✓ ${name}`);
      return true;
    } else {
      log(colors.red, `✗ ${name}`);
      console.log(`  Validation failed: ${validationResult}`);
      return false;
    }
  } catch (error) {
    log(colors.red, `✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log(`\n${colors.blue}Testing API at: ${BASE_URL}${colors.reset}\n`);

  const results = [];

  // Test /api/search
  results.push(await testEndpoint(
    'GET /api/search?q=water',
    '/api/search?q=water&limit=5',
    (data) => {
      if (!data.results) return 'Missing results array';
      if (!Array.isArray(data.results)) return 'Results is not an array';
      if (data.results.length === 0) return 'No results found';
      const word = data.results[0];
      if (!word.lexical_unit) return 'Missing lexical_unit field';
      if (!word.senses) return 'Missing senses field';
      console.log(`  Found ${data.results.length} results, first: "${word.lexical_unit}"`);
      return true;
    }
  ));

  // Test /api/search-paiute
  results.push(await testEndpoint(
    'GET /api/search-paiute?q=paa',
    '/api/search-paiute?q=paa&limit=5',
    (data) => {
      if (!data.results) return 'Missing results array';
      if (!Array.isArray(data.results)) return 'Results is not an array';
      if (data.results.length === 0) return 'No results found';
      const word = data.results[0];
      console.log(`  Found ${data.results.length} results, first: "${word.lexical_unit}"`);
      return true;
    }
  ));

  // Test /api/search-sentences
  results.push(await testEndpoint(
    'GET /api/search-sentences?q=eat',
    '/api/search-sentences?q=eat&limit=5',
    (data) => {
      if (!data.results) return 'Missing results array';
      if (!Array.isArray(data.results)) return 'Results is not an array';
      // Sentences might be empty, that's ok
      if (data.results.length > 0) {
        const sentence = data.results[0];
        if (!sentence.text && !sentence.translation) return 'Missing text/translation';
        console.log(`  Found ${data.results.length} results`);
      } else {
        console.log(`  No sentences found (this may be expected)`);
      }
      return true;
    }
  ));

  // Test /api/random-word
  results.push(await testEndpoint(
    'GET /api/random-word',
    '/api/random-word',
    (data) => {
      if (!data.word) return 'Missing word object';
      if (!data.word.lexical_unit) return 'Missing lexical_unit';
      if (!data.word.senses) return 'Missing senses';
      console.log(`  Got: "${data.word.lexical_unit}"`);
      return true;
    }
  ));

  // Test /api/random-sentence
  results.push(await testEndpoint(
    'GET /api/random-sentence',
    '/api/random-sentence',
    (data) => {
      if (!data.sentence) return 'Missing sentence object';
      console.log(`  Got sentence with ${data.sentence.text ? 'text' : 'no text'}`);
      return true;
    }
  ));

  // Test /api/word-of-the-day
  results.push(await testEndpoint(
    'GET /api/word-of-the-day',
    '/api/word-of-the-day',
    (data) => {
      if (!data.word) return 'Missing word object';
      if (!data.word.lexical_unit) return 'Missing lexical_unit';
      console.log(`  Word of the day: "${data.word.lexical_unit}"`);
      return true;
    }
  ));

  // Test /api/browse (letter counts)
  results.push(await testEndpoint(
    'GET /api/browse?counts=true',
    '/api/browse?counts=true',
    (data) => {
      if (!data.letterCounts) return 'Missing letterCounts array';
      if (!Array.isArray(data.letterCounts)) return 'letterCounts is not an array';
      if (data.letterCounts.length === 0) return 'No letter counts';
      const total = data.letterCounts.reduce((sum, l) => sum + l.count, 0);
      console.log(`  ${data.letterCounts.length} letters, ${total} total words`);
      return true;
    }
  ));

  // Test /api/browse (by letter)
  results.push(await testEndpoint(
    'GET /api/browse?letter=T&limit=5',
    '/api/browse?letter=T&limit=5',
    (data) => {
      if (!data.results) return 'Missing results array';
      if (!Array.isArray(data.results)) return 'Results is not an array';
      if (data.results.length === 0) return 'No results for letter T';
      console.log(`  Found ${data.results.length} words starting with T`);
      return true;
    }
  ));

  // Test /api/word/{id} - first get a word ID from search
  let wordId = null;
  try {
    const searchRes = await fetch(`${BASE_URL}/api/search?q=water&limit=1`);
    const searchData = await searchRes.json();
    if (searchData.results && searchData.results.length > 0) {
      wordId = searchData.results[0].id;
    }
  } catch (e) {
    // ignore
  }

  if (wordId) {
    results.push(await testEndpoint(
      `GET /api/word/{id}`,
      `/api/word/${encodeURIComponent(wordId)}`,
      (data) => {
        if (!data.word) return 'Missing word object';
        if (data.word.id !== wordId) return 'Word ID mismatch';
        console.log(`  Got word: "${data.word.lexical_unit}"`);
        return true;
      }
    ));
  } else {
    log(colors.yellow, `⚠ Skipping /api/word/{id} test (no word ID available)`);
  }

  // Test 404 for non-existent word
  results.push(await testEndpoint(
    'GET /api/word/{id} (404 case)',
    '/api/word/non-existent-word-id-12345',
    (data) => {
      // This should actually be a 404, but we're checking the error response
      if (data.error === 'Word not found') {
        console.log(`  Correctly returned 404`);
        return true;
      }
      return 'Expected 404 error';
    }
  ).then(r => !r)); // Invert because we expect this to "fail" (return 404)

  // Test missing query parameter
  try {
    const res = await fetch(`${BASE_URL}/api/search`);
    const data = await res.json();
    if (res.status === 400 && data.error) {
      log(colors.green, `✓ GET /api/search (400 for missing q)`);
      console.log(`  Correctly returned 400: ${data.error}`);
      results.push(true);
    } else {
      log(colors.red, `✗ GET /api/search (400 for missing q)`);
      console.log(`  Expected 400 status`);
      results.push(false);
    }
  } catch (e) {
    log(colors.red, `✗ GET /api/search (400 for missing q)`);
    console.log(`  Error: ${e.message}`);
    results.push(false);
  }

  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`\n${colors.blue}Results: ${passed}/${total} tests passed${colors.reset}`);

  if (passed === total) {
    log(colors.green, '\n✓ All tests passed!\n');
    process.exit(0);
  } else {
    log(colors.red, `\n✗ ${total - passed} test(s) failed\n`);
    process.exit(1);
  }
}

runTests();
