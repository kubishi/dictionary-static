import { pipeline, cos_sim, env } from '@xenova/transformers';

// Configure transformers.js for browser
env.allowLocalModels = false;
env.useBrowserCache = true;

let embedder = null;
let embeddingsData = null;
let processedEmbeddings = null; // Converted to Float32 for computation
let isInitialized = false;
let initPromise = null;
let initError = null;
let initProgress = { status: 'idle', message: '' };

// Convert Float16 (stored as Uint16) back to Float32
function float16ToFloat32(float16Array) {
  const result = new Float32Array(float16Array.length);
  for (let i = 0; i < float16Array.length; i++) {
    const h = float16Array[i];
    const sign = (h & 0x8000) >> 15;
    const exp = (h & 0x7c00) >> 10;
    const frac = h & 0x03ff;

    let f;
    if (exp === 0) {
      // Denormalized or zero
      f = (sign ? -1 : 1) * Math.pow(2, -14) * (frac / 1024);
    } else if (exp === 31) {
      // Infinity or NaN
      f = frac === 0 ? (sign ? -Infinity : Infinity) : NaN;
    } else {
      // Normalized
      f = (sign ? -1 : 1) * Math.pow(2, exp - 15) * (1 + frac / 1024);
    }
    result[i] = f;
  }
  return result;
}

// Progress callback for external monitoring
let progressCallback = null;

export function setProgressCallback(callback) {
  progressCallback = callback;
}

function updateProgress(status, message) {
  initProgress = { status, message };
  if (progressCallback) {
    progressCallback(initProgress);
  }
}

export function getInitProgress() {
  return initProgress;
}

export async function initializeSemanticSearch(precomputedEmbeddings) {
  if (isInitialized) return true;
  if (initPromise) return initPromise;
  if (initError) throw initError;

  initPromise = (async () => {
    try {
      updateProgress('loading', 'Loading semantic search model...');
      console.log('🔄 Loading semantic search model...');

      // Store and process precomputed embeddings
      if (precomputedEmbeddings) {
        embeddingsData = precomputedEmbeddings;
        console.log(`📊 Loaded ${embeddingsData.words.length} precomputed word embeddings`);

        // Convert Float16 to Float32 if needed
        const isFloat16 = embeddingsData.float16;
        console.log(`📊 Embedding format: ${isFloat16 ? 'Float16' : 'Float32'}`);

        processedEmbeddings = {
          words: embeddingsData.words.map(item => ({
            id: item.id,
            embedding: isFloat16 ? float16ToFloat32(item.e) : new Float32Array(item.e || item.embedding)
          })),
          sentences: embeddingsData.sentences.map(item => ({
            id: item.id,
            wordId: item.wordId,
            embedding: isFloat16 ? float16ToFloat32(item.e) : new Float32Array(item.e || item.embedding)
          }))
        };
        console.log(`📊 Processed embeddings for ${processedEmbeddings.words.length} words`);
      }

      // Load the model for query embedding (use same model as embeddings were generated with)
      const modelName = embeddingsData?.model || 'Xenova/all-MiniLM-L6-v2';
      console.log(`📊 Using model: ${modelName}`);

      embedder = await pipeline('feature-extraction', modelName, {
        quantized: true,
        progress_callback: (progress) => {
          if (progress.status === 'downloading') {
            const pct = Math.round(progress.progress || 0);
            updateProgress('downloading', `Downloading model: ${pct}%`);
            console.log(`Downloading model: ${progress.file} - ${pct}%`);
          } else if (progress.status === 'loading') {
            updateProgress('loading', 'Loading model into memory...');
          }
        }
      });

      isInitialized = true;
      updateProgress('ready', 'Semantic search ready');
      console.log('✅ Semantic search ready!');
      return true;
    } catch (error) {
      console.error('Error initializing semantic search:', error);
      initError = error;
      updateProgress('error', 'Failed to load semantic search');
      throw error;
    }
  })();

  return initPromise;
}

export function isSemanticSearchReady() {
  return isInitialized && processedEmbeddings !== null;
}

export function hasPrecomputedEmbeddings() {
  return processedEmbeddings !== null;
}

async function getQueryEmbedding(text) {
  if (!embedder) {
    throw new Error('Semantic search not initialized');
  }

  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

export async function semanticSearch(query, options = {}) {
  const {
    limit = 20,
    searchType = 'words',  // 'words', 'sentences', or 'all'
    minSimilarity = 0.3
  } = options;

  if (!isInitialized || !processedEmbeddings) {
    throw new Error('Semantic search not ready');
  }

  try {
    // Get query embedding
    const queryEmbedding = await getQueryEmbedding(query);
    const results = [];

    // Search words
    if (searchType === 'words' || searchType === 'all') {
      for (const item of processedEmbeddings.words) {
        const similarity = cosineSimilarity(queryEmbedding, item.embedding);

        if (similarity >= minSimilarity) {
          results.push({
            id: item.id,
            type: 'word',
            similarity,
            score: similarity
          });
        }
      }
    }

    // Search sentences
    if (searchType === 'sentences' || searchType === 'all') {
      for (const item of processedEmbeddings.sentences) {
        const similarity = cosineSimilarity(queryEmbedding, item.embedding);

        if (similarity >= minSimilarity) {
          results.push({
            id: item.id,
            wordId: item.wordId,
            type: 'sentence',
            similarity,
            score: similarity
          });
        }
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  } catch (error) {
    console.error('Error during semantic search:', error);
    throw error;
  }
}

// Hybrid search combining TF-IDF and semantic search
export async function hybridSearch(query, tfidfResults, options = {}) {
  const {
    limit = 20,
    semanticWeight = 0.6,  // How much to weight semantic vs TF-IDF
    tfidfWeight = 0.4
  } = options;

  if (!isSemanticSearchReady()) {
    // Fall back to TF-IDF only
    return tfidfResults.slice(0, limit);
  }

  try {
    // Get semantic results
    const semanticResults = await semanticSearch(query, { limit: limit * 2, searchType: 'words' });

    // Create score maps
    const semanticScores = new Map();
    const tfidfScores = new Map();

    // Normalize semantic scores (already 0-1)
    for (const result of semanticResults) {
      semanticScores.set(result.id, result.similarity);
    }

    // Normalize TF-IDF scores
    const maxTfidf = Math.max(...tfidfResults.map(r => r.score), 0.001);
    for (const result of tfidfResults) {
      tfidfScores.set(result.id, result.score / maxTfidf);
    }

    // Combine scores
    const allIds = new Set([...semanticScores.keys(), ...tfidfScores.keys()]);
    const combinedResults = [];

    for (const id of allIds) {
      const semantic = semanticScores.get(id) || 0;
      const tfidf = tfidfScores.get(id) || 0;
      const combined = (semantic * semanticWeight) + (tfidf * tfidfWeight);

      combinedResults.push({
        id,
        type: 'word',
        score: combined,
        semanticScore: semantic,
        tfidfScore: tfidf
      });
    }

    // Sort by combined score
    combinedResults.sort((a, b) => b.score - a.score);

    return combinedResults.slice(0, limit);
  } catch (error) {
    console.error('Hybrid search failed, falling back to TF-IDF:', error);
    return tfidfResults.slice(0, limit);
  }
}
