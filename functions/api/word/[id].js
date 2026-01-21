// GET /api/word/:id - Get word by ID
import {
  jsonResponse,
  errorResponse,
  handleOptions,
  loadWords,
  wordToApiFormat,
} from '../_shared.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet(context) {
  const { id } = context.params;

  if (!id) {
    return errorResponse('Word ID is required', 400);
  }

  try {
    const url = new URL(context.request.url);
    const baseUrl = url.origin;
    const words = await loadWords(baseUrl);

    // Handle both string and numeric IDs
    const numericId = parseInt(id, 10);
    const word = words.find(w => w.id === id || w.id === numericId);

    if (!word) {
      return errorResponse('Word not found', 404);
    }

    return jsonResponse({
      word: wordToApiFormat(word),
      audio: null, // No audio support in static version
    });
  } catch (error) {
    console.error('Error fetching word:', error);
    return errorResponse('Failed to fetch word', 500);
  }
}
