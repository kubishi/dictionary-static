// Data loading service
import { buildSearchIndex } from './smart-search';

let wordsData = null;
let sentencesData = null;
let searchableData = null;
let indexData = null;

export async function loadData() {
  if (wordsData) return; // Already loaded

  try {
    const [words, sentences, searchable, index] = await Promise.all([
      fetch('/data/words.json').then(r => r.json()),
      fetch('/data/sentences.json').then(r => r.json()),
      fetch('/data/searchable.json').then(r => r.json()),
      fetch('/data/index.json').then(r => r.json())
    ]);

    wordsData = words;
    sentencesData = sentences;
    searchableData = searchable;
    indexData = index;

    // Build smart search index
    buildSearchIndex(words, sentences);
  } catch (error) {
    console.error('Error loading dictionary data:', error);
    throw new Error('Failed to load dictionary data. Please build the data files first.');
  }
}

export function getWords() {
  return wordsData || [];
}

export function getWord(id) {
  const numId = parseInt(id);
  return wordsData?.find(w => w.id === numId);
}

// Get word by slug_guid format (e.g., "pahabichi_7f4306d7-d9a8-4791-81ff-1a8c9572d964")
// Also supports legacy numeric IDs for backwards compatibility
export function getWordBySlugOrId(slugOrId) {
  if (!wordsData) return null;
  
  // Check if it's a numeric ID (legacy format)
  const numId = parseInt(slugOrId);
  if (!isNaN(numId)) {
    return wordsData.find(w => w.id === numId);
  }
  
  // Parse slug_guid format
  const lastUnderscore = slugOrId.lastIndexOf('_');
  if (lastUnderscore === -1) {
    return null;
  }
  
  const guid = slugOrId.substring(lastUnderscore + 1);
  
  // Find by GUID
  return wordsData.find(w => w.guid === guid);
}

// Generate word URL path from word object
export function getWordUrl(word) {
  if (!word) return '';
  
  // Use slug_guid format if available
  if (word.slug && word.guid) {
    return `/word/${word.slug}_${word.guid}`;
  }
  
  // Fallback to numeric ID
  return `/word/${word.id}`;
}

export function getSentences() {
  return sentencesData || [];
}

export function getSentencesForWord(wordId) {
  const numId = parseInt(wordId);
  return sentencesData?.filter(s => s.wordId === numId) || [];
}

export function getSearchableData() {
  return searchableData;
}

export function getIndex() {
  return indexData;
}

// Simple hash function for deterministic word of the day
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Get word of the day - deterministic based on current date
export function getWordOfTheDay() {
  if (!wordsData || wordsData.length === 0) return null;
  
  // Get current date in YYYY-MM-DD format (local timezone)
  const now = new Date();
  const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Hash the date to get a consistent index
  const hash = simpleHash(dateString);
  const index = hash % wordsData.length;
  
  return wordsData[index];
}

// Simple text search (fallback when semantic search is loading)
export function searchWords(query) {
  if (!wordsData) return [];
  
  const lowerQuery = query.toLowerCase();
  return wordsData.filter(word => {
    // Search in word forms
    if (word.forms) {
      for (const form of Object.values(word.forms)) {
        if (form.toLowerCase().includes(lowerQuery)) return true;
      }
    }

    // Search in definitions and glosses
    for (const sense of word.senses || []) {
      // Check definitions
      if (sense.definitions) {
        for (const def of Object.values(sense.definitions)) {
          if (def.toLowerCase().includes(lowerQuery)) return true;
        }
      }

      // Check glosses
      if (sense.glosses) {
        for (const gloss of Object.values(sense.glosses)) {
          if (gloss.toLowerCase().includes(lowerQuery)) return true;
        }
      }
    }

    return false;
  });
}
