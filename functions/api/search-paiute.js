// GET /api/search-paiute - Search by Paiute word form
import {
  jsonResponse,
  errorResponse,
  handleOptions,
  loadWords,
  wordToApiFormat,
  isValidWord,
  searchPaiuteWords,
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
    const words = await loadWords(baseUrl);

    // Filter to valid words only
    const validWords = words.filter(isValidWord);

    // Search using Paiute-aware fuzzy matching
    const results = searchPaiuteWords(validWords, query, limit, skip)
      .map(wordToApiFormat);

    return jsonResponse({
      results,
      pagination: { limit, skip },
    });
  } catch (error) {
    console.error('Search error:', error);
    return errorResponse('Search failed', 500);
  }
}
