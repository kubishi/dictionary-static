import { pipeline } from '@xenova/transformers';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data');

// Test cases: query -> expected words that should appear in top results
const TEST_CASES = [
  {
    query: 'boss',
    expectedWords: ['pogina', 'uboggina'],
    description: 'Should find leadership/authority terms'
  },
  {
    query: 'leader',
    expectedWords: ['pogina'],
    description: 'Should find tribal leader'
  },
  {
    query: 'chief',
    expectedWords: ['pogina'],
    description: 'Should find tribal chief/leader'
  },
  {
    query: 'water',
    expectedWords: [],
    description: 'Water-related terms'
  },
  {
    query: 'animal',
    expectedWords: [],
    description: 'Animal-related terms'
  },
  {
    query: 'walk',
    expectedWords: [],
    description: 'Movement terms'
  },
  {
    query: 'house',
    expectedWords: ['nobidu\'u', 'nobi'],
    description: 'Building/dwelling terms'
  },
  {
    query: 'mother',
    expectedWords: [],
    description: 'Family terms'
  },
  {
    query: 'run',
    expectedWords: [],
    description: 'Fast movement'
  },
  {
    query: 'cold',
    expectedWords: [],
    description: 'Temperature terms'
  }
];

// Models to test
const MODELS_TO_TEST = [
  {
    name: 'all-MiniLM-L6-v2',
    id: 'Xenova/all-MiniLM-L6-v2',
    description: 'Current model - 22M params, 384 dims'
  },
  {
    name: 'bge-small-en-v1.5',
    id: 'Xenova/bge-small-en-v1.5',
    description: 'BGE small - optimized for retrieval, 384 dims'
  },
  {
    name: 'gte-small',
    id: 'Xenova/gte-small',
    description: 'GTE small - good semantic similarity, 384 dims'
  },
  {
    name: 'all-mpnet-base-v2',
    id: 'Xenova/all-mpnet-base-v2',
    description: 'MPNet base - higher quality, 768 dims'
  },
  {
    name: 'bge-base-en-v1.5',
    id: 'Xenova/bge-base-en-v1.5',
    description: 'BGE base - best quality, 768 dims'
  }
];

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

async function loadSearchableData() {
  const content = await fs.readFile(path.join(DATA_DIR, 'searchable.json'), 'utf-8');
  return JSON.parse(content);
}

async function loadWordsData() {
  const content = await fs.readFile(path.join(DATA_DIR, 'words.json'), 'utf-8');
  return JSON.parse(content);
}

async function testModel(modelConfig, searchableData, wordsData) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Model: ${modelConfig.name}`);
  console.log(`${modelConfig.description}`);
  console.log(`${'='.repeat(70)}`);

  let embedder;
  try {
    console.log('Loading model...');
    embedder = await pipeline('feature-extraction', modelConfig.id, {
      quantized: true
    });
  } catch (error) {
    console.error(`Failed to load model: ${error.message}`);
    return null;
  }

  // Generate embeddings for ALL words
  console.log(`Generating embeddings for all ${searchableData.words.length} words...`);

  const wordEmbeddings = [];
  for (let i = 0; i < searchableData.words.length; i++) {
    const word = searchableData.words[i];
    const output = await embedder(word.text, { pooling: 'mean', normalize: true });
    wordEmbeddings.push({
      id: word.id,
      text: word.text,
      embedding: Array.from(output.data)
    });

    if ((i + 1) % 500 === 0) {
      console.log(`  Progress: ${i + 1}/${searchableData.words.length}`);
    }
  }
  console.log(`  Done: ${searchableData.words.length}/${searchableData.words.length}\n`);

  // Create word lookup
  const wordById = new Map(wordsData.map(w => [w.id, w]));

  // Run test cases
  const scores = [];

  for (const testCase of TEST_CASES) {
    // Get query embedding
    const queryOutput = await embedder(testCase.query, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(queryOutput.data);

    // Calculate similarities
    const similarities = wordEmbeddings.map(we => {
      const wordData = wordById.get(we.id);
      return {
        id: we.id,
        word: wordData?.word || 'Unknown',
        definition: wordData?.senses?.[0]?.definitions?.en ||
                   wordData?.senses?.[0]?.glosses?.en || '',
        similarity: cosineSimilarity(queryEmbedding, we.embedding)
      };
    });

    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Show results
    console.log(`Query: "${testCase.query}"`);
    console.log('  Top 10 results:');
    for (let i = 0; i < 10; i++) {
      const r = similarities[i];
      const shortDef = r.definition.slice(0, 45) + (r.definition.length > 45 ? '...' : '');
      const marker = testCase.expectedWords.some(e =>
        r.word.toLowerCase().includes(e.toLowerCase())
      ) ? ' ✓' : '';
      console.log(`    ${(i + 1).toString().padStart(2)}. ${r.word.padEnd(20)} (${r.similarity.toFixed(4)}) ${shortDef}${marker}`);
    }

    // Check expected words
    if (testCase.expectedWords.length > 0) {
      console.log('  Expected words ranking:');
      for (const expected of testCase.expectedWords) {
        const rank = similarities.findIndex(s =>
          s.word.toLowerCase().includes(expected.toLowerCase())
        ) + 1;
        if (rank > 0) {
          const item = similarities[rank - 1];
          console.log(`    - "${expected}" found as "${item.word}" at rank ${rank} (sim: ${item.similarity.toFixed(4)})`);
          scores.push({ query: testCase.query, expected, rank, similarity: item.similarity });
        } else {
          console.log(`    - "${expected}" NOT FOUND`);
          scores.push({ query: testCase.query, expected, rank: Infinity, similarity: 0 });
        }
      }
    }
    console.log('');
  }

  // Calculate overall score for this model
  const avgRank = scores.length > 0
    ? scores.filter(s => s.rank !== Infinity).reduce((sum, s) => sum + s.rank, 0) / scores.filter(s => s.rank !== Infinity).length
    : Infinity;

  return {
    model: modelConfig.name,
    avgRank,
    scores
  };
}

async function main() {
  console.log('Loading data...');
  const searchableData = await loadSearchableData();
  const wordsData = await loadWordsData();

  console.log(`Loaded ${searchableData.words.length} words\n`);

  // Show target words
  console.log('Target words to find:');
  for (const tc of TEST_CASES) {
    for (const expected of tc.expectedWords) {
      const word = wordsData.find(w => w.word?.toLowerCase().includes(expected.toLowerCase()));
      if (word) {
        const searchable = searchableData.words.find(s => s.id === word.id);
        console.log(`\n  "${expected}" -> ${word.word} (ID: ${word.id})`);
        console.log(`    Definition: ${word.senses?.[0]?.definitions?.en || word.senses?.[0]?.glosses?.en}`);
        console.log(`    Searchable: ${searchable?.text?.slice(0, 80)}...`);
      }
    }
  }

  // Parse command line args
  const args = process.argv.slice(2);
  const modelFilter = args.find(a => a.startsWith('--model='))?.split('=')[1];

  let modelsToTest = MODELS_TO_TEST;
  if (modelFilter) {
    modelsToTest = MODELS_TO_TEST.filter(m =>
      m.name.toLowerCase().includes(modelFilter.toLowerCase())
    );
    console.log(`\nFiltered to models matching "${modelFilter}"`);
  }

  console.log(`\nTesting ${modelsToTest.length} models...`);

  const allResults = [];
  for (const model of modelsToTest) {
    const result = await testModel(model, searchableData, wordsData);
    if (result) {
      allResults.push(result);
    }
  }

  // Final comparison
  console.log('\n' + '='.repeat(70));
  console.log('FINAL COMPARISON - Average rank for expected words (lower is better)');
  console.log('='.repeat(70));

  allResults.sort((a, b) => a.avgRank - b.avgRank);
  for (const result of allResults) {
    console.log(`  ${result.model.padEnd(25)} avg rank: ${result.avgRank.toFixed(1)}`);
  }

  // Detailed breakdown
  console.log('\n' + '='.repeat(70));
  console.log('DETAILED RANKING BY QUERY');
  console.log('='.repeat(70));

  const queries = [...new Set(allResults[0]?.scores.map(s => `${s.query}:${s.expected}`) || [])];
  for (const queryKey of queries) {
    const [query, expected] = queryKey.split(':');
    console.log(`\n  "${query}" -> "${expected}":`);
    for (const result of allResults) {
      const score = result.scores.find(s => s.query === query && s.expected === expected);
      if (score) {
        const rankStr = score.rank === Infinity ? 'NOT FOUND' : `rank ${score.rank}`;
        console.log(`    ${result.model.padEnd(25)} ${rankStr}`);
      }
    }
  }
}

main().catch(console.error);
