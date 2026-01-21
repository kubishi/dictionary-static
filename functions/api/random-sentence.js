// GET /api/random-sentence - Get a random sentence
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
  try {
    const url = new URL(context.request.url);
    const baseUrl = url.origin;
    const sentences = await loadSentences(baseUrl);

    if (sentences.length === 0) {
      return errorResponse('No sentences found', 404);
    }

    // Pick a random sentence
    const randomIndex = Math.floor(Math.random() * sentences.length);
    const sentence = sentences[randomIndex];

    return jsonResponse({
      sentence: sentenceToApiFormat(sentence),
    });
  } catch (error) {
    console.error('Error fetching random sentence:', error);
    return errorResponse('Failed to fetch random sentence', 500);
  }
}
