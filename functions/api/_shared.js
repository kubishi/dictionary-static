// Shared utilities for Cloudflare Functions API

// Cache for loaded data
let wordsCache = null;
let sentencesCache = null;
let embeddingsCache = null;
let indexCache = null;

// CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// JSON response helper
export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

// Error response helper
export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

// Handle OPTIONS requests
export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Load data from static JSON files
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

export async function loadWords(baseUrl) {
  if (!wordsCache) {
    wordsCache = await fetchJson(`${baseUrl}/data/words.json`);
  }
  return wordsCache;
}

export async function loadSentences(baseUrl) {
  if (!sentencesCache) {
    sentencesCache = await fetchJson(`${baseUrl}/data/sentences.json`);
  }
  return sentencesCache;
}

export async function loadEmbeddings(baseUrl) {
  if (!embeddingsCache) {
    embeddingsCache = await fetchJson(`${baseUrl}/data/embeddings.json`);
  }
  return embeddingsCache;
}

export async function loadIndex(baseUrl) {
  if (!indexCache) {
    indexCache = await fetchJson(`${baseUrl}/data/index.json`);
  }
  return indexCache;
}

// Convert Float16 array to Float32
function float16ToFloat32(uint16Array) {
  const float32Array = new Float32Array(uint16Array.length);
  for (let i = 0; i < uint16Array.length; i++) {
    const h = uint16Array[i];
    const sign = (h >> 15) & 0x1;
    const exponent = (h >> 10) & 0x1f;
    const mantissa = h & 0x3ff;

    let f;
    if (exponent === 0) {
      f = mantissa === 0 ? 0 : Math.pow(2, -14) * (mantissa / 1024);
    } else if (exponent === 31) {
      f = mantissa === 0 ? Infinity : NaN;
    } else {
      f = Math.pow(2, exponent - 15) * (1 + mantissa / 1024);
    }
    float32Array[i] = sign ? -f : f;
  }
  return float32Array;
}

// Decode base64 embedding
function decodeEmbedding(base64String, isFloat16 = true) {
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  if (isFloat16) {
    const uint16Array = new Uint16Array(bytes.buffer);
    return float16ToFloat32(uint16Array);
  } else {
    return new Float32Array(bytes.buffer);
  }
}

// Cosine similarity
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Normalize text for Paiute fuzzy matching
export function normalizeForMatching(text) {
  return text
    .toLowerCase()
    .replace(/[kg]/g, 'k')
    .replace(/[td]/g, 't')
    .replace(/[sz]/g, 's')
    .replace(/[üu]/g, 'u')
    .replace(/w̃/g, 'w')
    .replace(/[mw]/g, 'm')
    .replace(/[pb]/g, 'p');
}

// Levenshtein distance
export function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// Convert internal word format to API format
export function wordToApiFormat(word) {
  const primaryForm = word.forms ? Object.values(word.forms)[0] : '';

  return {
    id: word.id,
    lexical_unit: primaryForm,
    word: primaryForm,
    dateCreated: word.dateCreated || null,
    dateModified: word.dateModified || null,
    traits: word.morphType ? { 'morph-type': word.morphType } : {},
    senses: (word.senses || []).map(sense => ({
      id: sense.id || null,
      grammatical_info: sense.partOfSpeech || null,
      gloss: sense.glosses ? Object.values(sense.glosses)[0] : null,
      definition: sense.definitions ? Object.values(sense.definitions)[0] : null,
      examples: (sense.examples || []).map(ex => ({
        form: ex.forms ? Object.values(ex.forms)[0] : '',
        translation: ex.translations ? Object.values(ex.translations)[0] : '',
        source: ex.source || null,
        note: ex.note || null,
      })),
    })),
  };
}

// Convert internal sentence format to API format
export function sentenceToApiFormat(sentence) {
  return {
    text: sentence.forms ? Object.values(sentence.forms)[0] : '',
    translation: sentence.translations ? Object.values(sentence.translations)[0] : '',
    word_ids: sentence.wordIds || [],
    source: sentence.source || null,
  };
}

// Search Paiute words by form
export function searchPaiuteWords(words, query, limit = 10, skip = 0) {
  const normalizedQuery = normalizeForMatching(query);
  const maxDistance = Math.max(1, Math.floor(query.length / 4));

  const scored = words.map(word => {
    const primaryForm = word.forms ? Object.values(word.forms)[0] : '';
    const normalizedForm = normalizeForMatching(primaryForm);
    let score = 0;

    if (normalizedForm === normalizedQuery) {
      score = 1000;
    } else if (normalizedForm.startsWith(normalizedQuery)) {
      score = 900 - (normalizedForm.length - normalizedQuery.length);
    } else if (normalizedForm.includes(normalizedQuery)) {
      score = 700 - normalizedForm.indexOf(normalizedQuery) * 2;
    } else if (normalizedQuery.length >= 3) {
      const wordStart = normalizedForm.substring(0, normalizedQuery.length);
      const distance = levenshteinDistance(normalizedQuery, wordStart);
      if (distance <= maxDistance) {
        score = 500 - distance * 50;
      }
    }

    if (score === 0 && normalizedQuery.length >= 4) {
      const distance = levenshteinDistance(normalizedQuery, normalizedForm);
      if (distance <= maxDistance) {
        score = 300 - distance * 30;
      }
    }

    return { word, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(skip, skip + limit)
    .map(item => item.word);
}

// Semantic search using precomputed embeddings
export async function semanticSearch(items, embeddings, queryEmbedding, limit = 10, skip = 0) {
  const isFloat16 = embeddings.float16 !== false;
  const embeddingMap = new Map();

  for (const emb of embeddings.embeddings) {
    embeddingMap.set(emb.id, decodeEmbedding(emb.embedding, isFloat16));
  }

  const scored = items.map(item => {
    const embedding = embeddingMap.get(item.id);
    if (!embedding) return { item, score: 0 };

    const score = cosineSimilarity(queryEmbedding, embedding);
    return { item, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(skip, skip + limit)
    .map(item => item.item);
}

// Check if word is valid (has senses with definitions)
export function isValidWord(word) {
  if (!word.senses || word.senses.length === 0) return false;
  return word.senses.some(sense =>
    (sense.glosses && Object.keys(sense.glosses).length > 0) ||
    (sense.definitions && Object.keys(sense.definitions).length > 0)
  );
}

// Get first alphabetic character
export function getFirstLetter(text) {
  const match = text.match(/[a-zA-Z]/);
  return match ? match[0].toUpperCase() : '#';
}
