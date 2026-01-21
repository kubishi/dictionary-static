// GET /api/word-of-the-day - Get word of the day
import {
  jsonResponse,
  errorResponse,
  handleOptions,
  loadWords,
  wordToApiFormat,
  isValidWord,
} from './_shared.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const baseUrl = url.origin;
    const words = await loadWords(baseUrl);

    // Filter to valid words only
    const validWords = words.filter(isValidWord);

    if (validWords.length === 0) {
      return errorResponse('No words found', 404);
    }

    // Use the same deterministic approach as the frontend
    // This ensures API and frontend show the same word
    const today = new Date();
    const dayOfYear = getDayOfYear(today);
    const year = today.getFullYear();

    // Prefer words with examples
    const wordsWithExamples = validWords.filter(word =>
      word.senses?.some(sense => sense.examples?.length > 0)
    );

    const pool = wordsWithExamples.length > 0 ? wordsWithExamples : validWords;

    // Deterministic selection based on date
    const seed = year * 1000 + dayOfYear;
    const index = seed % pool.length;
    const word = pool[index];

    return jsonResponse({
      word: wordToApiFormat(word),
      audio: null,
    });
  } catch (error) {
    console.error('Error fetching word of the day:', error);
    return errorResponse('Failed to fetch word of the day', 500);
  }
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}
