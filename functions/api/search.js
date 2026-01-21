// GET /api/search - Semantic search for English meanings
import {
  jsonResponse,
  errorResponse,
  handleOptions,
  loadWords,
  loadEmbeddings,
  wordToApiFormat,
  isValidWord,
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
    const [words, embeddingsData] = await Promise.all([
      loadWords(baseUrl),
      loadEmbeddings(baseUrl),
    ]);

    // Filter to valid words only
    const validWords = words.filter(isValidWord);

    // For semantic search, we need to generate a query embedding
    // Since we can't run the model server-side easily, we'll use TF-IDF-like matching
    // on the searchable text (definitions, glosses)
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 1);

    const scored = validWords.map(word => {
      let score = 0;
      const searchText = getSearchableText(word).toLowerCase();

      // Exact phrase match
      if (searchText.includes(queryLower)) {
        score += 100;
      }

      // Term matches
      for (const term of queryTerms) {
        if (searchText.includes(term)) {
          score += 10;
          // Bonus for word boundary matches
          const regex = new RegExp(`\\b${term}\\b`, 'i');
          if (regex.test(searchText)) {
            score += 5;
          }
        }
      }

      return { word, score };
    });

    const results = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(skip, skip + limit)
      .map(item => wordToApiFormat(item.word));

    return jsonResponse({
      results,
      pagination: { limit, skip },
    });
  } catch (error) {
    console.error('Search error:', error);
    return errorResponse('Search failed', 500);
  }
}

function getSearchableText(word) {
  const parts = [];

  // Add all definitions and glosses
  for (const sense of word.senses || []) {
    if (sense.definitions) {
      parts.push(...Object.values(sense.definitions));
    }
    if (sense.glosses) {
      parts.push(...Object.values(sense.glosses));
    }
  }

  return parts.join(' ');
}
