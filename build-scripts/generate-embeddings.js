import { pipeline } from '@xenova/transformers';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data');

// Configuration - can be overridden via command line args
// Models tested (best to worst for this dictionary):
//   - bge-base-en-v1.5: Best quality, 768 dims, ~400MB model, ~13MB embeddings
//   - gte-small: Good quality, 384 dims, ~120MB model, ~6.5MB embeddings
//   - bge-small-en-v1.5: Good quality, 384 dims, ~120MB model, ~6.5MB embeddings
//   - all-MiniLM-L6-v2: Decent, 384 dims, ~90MB model, ~6.5MB embeddings
const DEFAULT_MODEL = 'Xenova/bge-base-en-v1.5';
const INCLUDE_SENTENCES = false; // Set to true to include sentence embeddings (adds ~30MB)
const USE_FLOAT16 = true; // Use Float16 to reduce file size by ~50%

// Parse command line args for model override
const args = process.argv.slice(2);
const modelArg = args.find(a => a.startsWith('--model='));
const MODEL_NAME = modelArg ? modelArg.split('=')[1] : DEFAULT_MODEL;

// Convert Float32 to Float16 (stored as Uint16)
function float32ToFloat16(float32) {
  const float16 = new Uint16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const val = float32[i];
    // Simplified float32 to float16 conversion
    const floatView = new Float32Array([val]);
    const intView = new Uint32Array(floatView.buffer);
    const f = intView[0];

    const sign = (f >> 16) & 0x8000;
    const exp = ((f >> 23) & 0xff) - 127 + 15;
    const frac = (f >> 13) & 0x3ff;

    if (exp <= 0) {
      float16[i] = sign; // Underflow to zero
    } else if (exp >= 31) {
      float16[i] = sign | 0x7c00; // Overflow to infinity
    } else {
      float16[i] = sign | (exp << 10) | frac;
    }
  }
  return Array.from(float16);
}

async function generateEmbeddings() {
  console.log('📊 Generating embeddings for semantic search...');
  console.log(`Using model: ${MODEL_NAME}`);
  console.log(`Float16 compression: ${USE_FLOAT16 ? 'enabled' : 'disabled'}`);
  console.log(`Include sentences: ${INCLUDE_SENTENCES}`);

  // Load the searchable data
  const searchablePath = path.join(DATA_DIR, 'searchable.json');
  let searchableData;

  try {
    const content = await fs.readFile(searchablePath, 'utf-8');
    searchableData = JSON.parse(content);
  } catch (error) {
    console.error('❌ Error: searchable.json not found. Run parse-lift.js first.');
    process.exit(1);
  }

  console.log(`Found ${searchableData.words.length} words and ${searchableData.sentences.length} sentences`);

  // Initialize the embedding pipeline
  console.log('🔄 Loading embedding model (this may take a moment on first run)...');
  const embedder = await pipeline('feature-extraction', MODEL_NAME, {
    quantized: true, // Use quantized model for faster inference
  });

  // Generate embeddings for words
  console.log('🔄 Generating word embeddings...');
  const wordEmbeddings = [];

  for (let i = 0; i < searchableData.words.length; i++) {
    const word = searchableData.words[i];

    // Generate embedding
    const output = await embedder(word.text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data);

    wordEmbeddings.push({
      id: word.id,
      e: USE_FLOAT16 ? float32ToFloat16(embedding) : embedding
    });

    // Progress update every 100 words
    if ((i + 1) % 100 === 0 || i === searchableData.words.length - 1) {
      console.log(`  Words: ${i + 1}/${searchableData.words.length}`);
    }
  }

  // Generate embeddings for sentences (optional - can be large)
  const sentenceEmbeddings = [];

  if (INCLUDE_SENTENCES) {
    console.log('🔄 Generating sentence embeddings...');

    for (let i = 0; i < searchableData.sentences.length; i++) {
      const sentence = searchableData.sentences[i];

      // Skip empty text
      if (!sentence.text || sentence.text.trim().length === 0) {
        continue;
      }

      const output = await embedder(sentence.text, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);

      sentenceEmbeddings.push({
        id: sentence.id,
        wordId: sentence.wordId,
        e: USE_FLOAT16 ? float32ToFloat16(embedding) : embedding
      });

      // Progress update every 500 sentences
      if ((i + 1) % 500 === 0 || i === searchableData.sentences.length - 1) {
        console.log(`  Sentences: ${i + 1}/${searchableData.sentences.length}`);
      }
    }
  }

  // Store embeddings in a compact format
  const embeddingsData = {
    model: MODEL_NAME,
    dimensions: 384,
    float16: USE_FLOAT16,
    generatedAt: new Date().toISOString(),
    words: wordEmbeddings,
    sentences: sentenceEmbeddings
  };

  // Write embeddings
  const embeddingsPath = path.join(DATA_DIR, 'embeddings.json');
  await fs.writeFile(embeddingsPath, JSON.stringify(embeddingsData));

  // Calculate file size
  const stats = await fs.stat(embeddingsPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`✅ Generated ${wordEmbeddings.length} word embeddings and ${sentenceEmbeddings.length} sentence embeddings`);
  console.log(`📦 Embeddings file size: ${sizeMB} MB`);
  console.log(`📁 Saved to: ${embeddingsPath}`);
}

// Run if called directly
generateEmbeddings().catch(error => {
  console.error('❌ Error generating embeddings:', error);
  process.exit(1);
});
