// Smart search implementation using TF-IDF and fuzzy matching
// No heavy dependencies required!

let searchIndex = null;
let wordDocuments = [];

// Build search index from searchable data
export function buildSearchIndex(words, sentences) {
  console.log('🔨 Building search index...');
  
  wordDocuments = words.map(word => {
    const text = [
      word.word,
      ...Object.values(word.forms || {}),
      ...word.senses.flatMap(s => [
        ...Object.values(s.definitions || {}),
        ...Object.values(s.glosses || {})
      ])
    ].filter(Boolean).join(' ').toLowerCase();

    return {
      id: word.id,
      type: 'word',
      text,
      tokens: tokenize(text)
    };
  });

  // Build TF-IDF index
  searchIndex = buildTFIDF(wordDocuments);
  console.log('✅ Search index ready!');
}

// Tokenize text into words
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0);
}

// Build TF-IDF index
function buildTFIDF(documents) {
  const docCount = documents.length;
  const termDocFreq = new Map(); // term -> number of docs containing term
  const termFreq = documents.map(doc => {
    const tf = new Map();
    for (const token of doc.tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    return tf;
  });

  // Calculate document frequency for each term
  for (const doc of documents) {
    const uniqueTokens = new Set(doc.tokens);
    for (const token of uniqueTokens) {
      termDocFreq.set(token, (termDocFreq.get(token) || 0) + 1);
    }
  }

  // Calculate TF-IDF for each document
  const tfidf = documents.map((doc, docIdx) => {
    const scores = new Map();
    for (const [term, freq] of termFreq[docIdx]) {
      const tf = freq / doc.tokens.length;
      const idf = Math.log(docCount / (termDocFreq.get(term) || 1));
      scores.set(term, tf * idf);
    }
    return scores;
  });

  return { tfidf, termDocFreq, docCount };
}

// Smart search function
export function smartSearch(query, limit = 20) {
  if (!searchIndex || !wordDocuments.length) {
    console.warn('Search index not built yet');
    return [];
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  console.log(`🔍 Searching for: ${queryTokens.join(', ')}`);

  // Calculate query TF-IDF
  const queryTF = new Map();
  for (const token of queryTokens) {
    queryTF.set(token, (queryTF.get(token) || 0) + 1);
  }

  const queryTFIDF = new Map();
  for (const [term, freq] of queryTF) {
    const tf = freq / queryTokens.length;
    const docFreq = searchIndex.termDocFreq.get(term) || 0;
    const idf = docFreq > 0 ? Math.log(searchIndex.docCount / docFreq) : 0;
    queryTFIDF.set(term, tf * idf);
  }

  // Calculate cosine similarity for each document
  const results = [];
  for (let i = 0; i < wordDocuments.length; i++) {
    const doc = wordDocuments[i];
    const docTFIDF = searchIndex.tfidf[i];

    let dotProduct = 0;
    let queryMag = 0;
    let docMag = 0;

    // Calculate dot product and magnitudes
    for (const [term, queryScore] of queryTFIDF) {
      queryMag += queryScore * queryScore;
      const docScore = docTFIDF.get(term) || 0;
      dotProduct += queryScore * docScore;
    }

    for (const score of docTFIDF.values()) {
      docMag += score * score;
    }

    queryMag = Math.sqrt(queryMag);
    docMag = Math.sqrt(docMag);

    let similarity = 0;
    if (queryMag > 0 && docMag > 0) {
      similarity = dotProduct / (queryMag * docMag);
    }

    // Boost exact matches and prefix matches
    let boost = 1;
    const lowerText = doc.text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    if (lowerText.includes(lowerQuery)) {
      boost = 5; // Big boost for exact phrase match
    } else if (lowerText.startsWith(lowerQuery)) {
      boost = 3; // Boost for prefix match
    } else {
      // Check if any query token matches start of document
      for (const token of queryTokens) {
        if (lowerText.startsWith(token)) {
          boost = 2;
          break;
        }
      }
    }

    // Only include documents with some similarity
    if (similarity > 0 || boost > 1) {
      results.push({
        id: doc.id,
        type: doc.type,
        score: similarity * boost,
        text: doc.text
      });
    }
  }

  // Sort by score and return top results
  results.sort((a, b) => b.score - a.score);
  
  console.log(`Found ${results.length} matches, returning top ${limit}`);
  return results.slice(0, limit);
}

// Simple fuzzy matching for suggestions
export function fuzzyMatch(query, text, threshold = 0.6) {
  const s1 = query.toLowerCase();
  const s2 = text.toLowerCase();
  
  if (s2.includes(s1)) return true;
  
  // Calculate Levenshtein distance ratio
  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  const similarity = 1 - distance / maxLen;
  
  return similarity >= threshold;
}

function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}
