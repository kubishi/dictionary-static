// GET /api/browse - Browse dictionary alphabetically
import {
  jsonResponse,
  errorResponse,
  handleOptions,
  loadWords,
  wordToApiFormat,
  isValidWord,
  getFirstLetter,
} from './_shared.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const letter = url.searchParams.get('letter');
  const counts = url.searchParams.get('counts');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const skip = parseInt(url.searchParams.get('skip') || '0', 10);

  try {
    const baseUrl = url.origin;
    const words = await loadWords(baseUrl);

    // Filter to valid words only
    const validWords = words.filter(isValidWord);

    // If counts requested, return letter counts
    if (counts === 'true') {
      const letterCounts = {};

      for (const word of validWords) {
        const primaryForm = word.forms ? Object.values(word.forms)[0] : '';
        const firstLetter = getFirstLetter(primaryForm);
        letterCounts[firstLetter] = (letterCounts[firstLetter] || 0) + 1;
      }

      const sortedCounts = Object.entries(letterCounts)
        .map(([letter, count]) => ({ letter, count }))
        .sort((a, b) => a.letter.localeCompare(b.letter));

      return jsonResponse(
        { letterCounts: sortedCounts },
        200,
        { 'Cache-Control': 'public, max-age=3600' }
      );
    }

    // Filter by letter if provided
    let filteredWords = validWords;
    if (letter) {
      filteredWords = validWords.filter(word => {
        const primaryForm = word.forms ? Object.values(word.forms)[0] : '';
        return getFirstLetter(primaryForm) === letter.toUpperCase();
      });
    }

    // Sort alphabetically
    filteredWords.sort((a, b) => {
      const aForm = (a.forms ? Object.values(a.forms)[0] : '').toLowerCase();
      const bForm = (b.forms ? Object.values(b.forms)[0] : '').toLowerCase();
      return aForm.localeCompare(bForm);
    });

    // Apply pagination
    const results = filteredWords
      .slice(skip, skip + limit)
      .map(wordToApiFormat);

    return jsonResponse({
      results,
      pagination: { letter: letter || null, limit, skip },
    });
  } catch (error) {
    console.error('Browse error:', error);
    return errorResponse('Browse failed', 500);
  }
}
