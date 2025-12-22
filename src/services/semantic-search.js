import { pipeline, cos_sim, env } from '@xenova/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let embedder = null;
let embeddingCache = new Map();
let isInitialized = false;
let initPromise = null;
let initError = null;

export async function initializeSemanticSearch() {
  if (isInitialized) return;
  if (initPromise) return initPromise;
  if (initError) throw initError;

  initPromise = (async () => {
    try {
      console.log('🔄 Loading semantic search model...');
      console.log('This may take a minute on first load...');
      
      // Use a lightweight model for embeddings
      embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        progress_callback: (progress) => {
          if (progress.status === 'downloading') {
            console.log(`Downloading model: ${progress.file} - ${Math.round(progress.progress)}%`);
          }
        }
      });
      
      isInitialized = true;
      console.log('✅ Semantic search ready!');
    } catch (error) {
      console.error('Error initializing semantic search:', error);
      console.log('Falling back to text-based search only');
      initError = error;
      throw error;
    }
  })();

  return initPromise;
}

export function isSemanticSearchReady() {
  return isInitialized;
}

async function getEmbedding(text) {
  if (!embedder) {
    throw new Error('Semantic search not initialized');
  }

  // Check cache
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text);
  }

  // Generate embedding
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  const embedding = Array.from(output.data);
  
  // Cache it (limit cache size)
  if (embeddingCache.size > 1000) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }
  embeddingCache.set(text, embedding);

  return embedding;
}

export async function semanticSearch(query, searchableData, limit = 20) {
  if (!isInitialized) {
    throw new Error('Semantic search not ready');
  }

  try {
    // Get query embedding
    const queryEmbedding = await getEmbedding(query);

    // Get embeddings for all searchable items (or use pre-computed)
    const results = [];

    // Search words
    for (const item of searchableData.words) {
      const itemEmbedding = await getEmbedding(item.text);
      const similarity = cos_sim(queryEmbedding, itemEmbedding);
      
      results.push({
        id: item.id,
        type: 'word',
        similarity,
        text: item.text
      });
    }

    // Sort by similarity and return top results
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  } catch (error) {
    console.error('Error during semantic search:', error);
    throw error;
  }
}

// Precompute embeddings for all searchable items (optional optimization)
export async function precomputeEmbeddings(searchableData) {
  if (!isInitialized) return;

  console.log('🔄 Pre-computing embeddings...');
  const items = [...searchableData.words, ...searchableData.sentences];
  
  let count = 0;
  for (const item of items) {
    await getEmbedding(item.text);
    count++;
    if (count % 10 === 0) {
      console.log(`Processed ${count}/${items.length} embeddings...`);
    }
  }
  
  console.log('✅ Embeddings pre-computed!');
}
