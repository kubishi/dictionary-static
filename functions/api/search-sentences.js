// GET /api/search-sentences - Search example sentences
import {
  jsonResponse,
  errorResponse,
  handleOptions,
  loadSentences,
  sentenceToApiFormat,
} from './_shared.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const query = url.searchParams.get('q');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 100);
  const skip = parseInt(url.searchParams.get('skip') || '0', 10);

  if (!query) {
    return errorResponse('Query parameter "q" is required', 400);
  }

  try {
    const baseUrl = url.origin;
    const sentences = await loadSentences(baseUrl);

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 1);

    const scored = sentences.map(sentence => {
      let score = 0;
      const searchText = getSearchableText(sentence).toLowerCase();

      // Exact phrase match
      if (searchText.includes(queryLower)) {
        score += 100;
      }

      // Term matches
      for (const term of queryTerms) {
        if (searchText.includes(term)) {
          score += 10;
          const regex = new RegExp(`\\b${term}\\b`, 'i');
          if (regex.test(searchText)) {
            score += 5;
          }
        }
      }

      return { sentence, score };
    });

    const results = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(skip, skip + limit)
      .map(item => sentenceToApiFormat(item.sentence));

    return jsonResponse({
      results,
      pagination: { limit, skip },
    });
  } catch (error) {
    console.error('Search error:', error);
    return errorResponse('Search failed', 500);
  }
}

function getSearchableText(sentence) {
  const parts = [];

  if (sentence.forms) {
    parts.push(...Object.values(sentence.forms));
  }
  if (sentence.translations) {
    parts.push(...Object.values(sentence.translations));
  }

  return parts.join(' ');
}
