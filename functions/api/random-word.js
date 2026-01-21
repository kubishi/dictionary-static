// GET /api/random-word - Get a random word
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

    // Pick a random word
    const randomIndex = Math.floor(Math.random() * validWords.length);
    const word = validWords[randomIndex];

    return jsonResponse({
      word: wordToApiFormat(word),
      audio: null,
    });
  } catch (error) {
    console.error('Error fetching random word:', error);
    return errorResponse('Failed to fetch random word', 500);
  }
}
